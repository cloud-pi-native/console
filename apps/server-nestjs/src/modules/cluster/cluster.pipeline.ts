import type { CleanedCluster, ClusterDetails, CreateClusterBody, UpdateClusterBody } from '@cpn-console/shared'
import type { EventEmitter2 } from '@nestjs/event-emitter'
import type { Cluster, Project, User } from '@prisma/client'
import type { PrismaService } from '../infrastructure/database/prisma.service'
import type { LogService } from '../log/log.service'
import { ClusterPrivacySchema, KubeconfigSchema } from '@cpn-console/shared'
import { Data, Effect } from 'effect'
import { retried } from '../../utils/effect.utils'
import {
  createCluster as createClusterQuery,
  deleteCluster as deleteClusterQuery,
  getClusterById,
  getClusterByLabel,
  getClusterDetails as getClusterDetailsQuery,
  getClusterEnvironments,
  getClusterUsage as getClusterUsageQuery,
  getProjectsByClusterId,
  linkClusterToProjects,
  linkClusterToStages,
  linkZoneToClusters,
  listClusters as listClustersQuery,
  listClustersWhere,
  listStagesByClusterId,
  removeClusterFromProject,
  removeClusterFromStage,
  updateCluster as updateClusterQuery,
} from './cluster-queries.utils'

export class ClusterNotFound extends Data.TaggedError('ClusterNotFound')<{ clusterId: string }> {}
export class LabelTaken extends Data.TaggedError('LabelTaken')<{ label: string }> {}
export class EnvironmentsActive extends Data.TaggedError('EnvironmentsActive')<{ clusterId: string }> {}
export class HookFailed extends Data.TaggedError('HookFailed')<{ clusterId: string, cause: unknown }> {}

export interface ClusterDeps {
  prisma: PrismaService
  eventEmitter: EventEmitter2
  logs: LogService
}

// request -> business

function assertLabelFree(prisma: PrismaService, label: string) {
  return Effect.tryPromise(() => getClusterByLabel(prisma, label)).pipe(
    Effect.flatMap(row => row ? Effect.fail(new LabelTaken({ label })) : Effect.void),
  )
}

function ensureClusterExists(prisma: PrismaService, clusterId: string) {
  return retried(Effect.tryPromise(() => getClusterById(prisma, clusterId))).pipe(
    Effect.filterOrFail(dbCluster => dbCluster !== null, () => new ClusterNotFound({ clusterId })),
  )
}

function decodeKubeconfig(kubeconfig: { cluster: unknown, user: unknown }) {
  return Effect.try({
    try: () => ({
      cluster: KubeconfigSchema.shape.cluster.passthrough().parse(kubeconfig.cluster),
      user: KubeconfigSchema.shape.user.passthrough().parse(kubeconfig.user),
    }),
    catch: cause => cause,
  })
}

// database

function createClusterRow(prisma: PrismaService, data: CreateClusterBody) {
  const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data
  return Effect.tryPromise(() => prisma.$transaction(async (tx) => {
    const clusterCreated = await createClusterQuery(tx, clusterData, kubeconfig, zoneId)
    if (data.privacy !== ClusterPrivacySchema.enum.public && projectIds?.length) {
      await linkClusterToProjects(tx, clusterCreated.id, projectIds)
    }
    if (stageIds?.length) {
      await linkClusterToStages(tx, clusterCreated.id, stageIds)
    }
    return { clusterCreated, zoneId }
  }))
}

function updateClusterRow(prisma: PrismaService, data: UpdateClusterBody, clusterId: string) {
  const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data
  return Effect.tryPromise(() => prisma.$transaction(async (tx) => {
    const clusterUpdated = await updateClusterQuery(tx, clusterId, clusterData, kubeconfig)
    if (zoneId) {
      await linkZoneToClusters(tx, zoneId, [clusterId])
    }
    const dbProjects = await getProjectsByClusterId(tx, clusterId)
    let projectsToRemove: Project['id'][] = []
    if (projectIds && clusterUpdated.privacy === ClusterPrivacySchema.enum.public) {
      projectsToRemove = dbProjects?.map(project => project.id) ?? []
    } else if (projectIds && clusterUpdated.privacy === ClusterPrivacySchema.enum.dedicated) {
      await linkClusterToProjects(tx, clusterId, projectIds)
      projectsToRemove = dbProjects?.map(project => project.id)?.filter(dbProjectId => !projectIds.includes(dbProjectId)) ?? []
    } else if (clusterUpdated.privacy === ClusterPrivacySchema.enum.public) {
      projectsToRemove = dbProjects?.map(project => project.id) ?? []
    }
    for (const projectId of projectsToRemove) {
      await removeClusterFromProject(tx, clusterUpdated.id, projectId)
    }
    if (stageIds) {
      await linkClusterToStages(tx, clusterId, stageIds)
      const dbStages = await listStagesByClusterId(tx, clusterId)
      if (dbStages) {
        for (const stage of dbStages) {
          if (!stageIds.includes(stage.id)) {
            await removeClusterFromStage(tx, clusterUpdated.id, stage.id)
          }
        }
      }
    }
    return clusterUpdated
  }))
}

function deleteClusterRow(prisma: PrismaService, clusterId: string, force?: boolean) {
  return Effect.tryPromise(() => prisma.$transaction(async (tx) => {
    if (force) {
      const envs = await tx.environment.deleteMany({ where: { clusterId } })
      return `${envs.count} environnements supprimés de force, n'oubliez pas de reprovisionner les projets concernés`
    }
    const environment = await tx.environment.findFirst({ where: { clusterId } })
    if (environment) return 'active-environments'
    await deleteClusterQuery(tx, clusterId)
    return null
  }))
}

// business -> side effects

function emitUpsertHook({ eventEmitter }: ClusterDeps, clusterId: string, zoneId: Cluster['zoneId']) {
  return Effect.tryPromise({
    try: () => Promise.resolve().then(() => eventEmitter.emitAsync('cluster.upsert', { clusterId, zoneId })),
    catch: cause => new HookFailed({ clusterId, cause }),
  })
}

function emitDeleteHook({ eventEmitter }: ClusterDeps, clusterId: string) {
  return Effect.catchAll(
    Effect.tryPromise({
      try: () => Promise.resolve().then(() => eventEmitter.emitAsync('cluster.delete', { clusterId })),
      catch: cause => cause,
    }),
    () => Effect.void,
  )
}

function addLog({ logs }: ClusterDeps, action: string, data: Record<string, unknown>, userId?: string, requestId?: string) {
  return Effect.tryPromise({
    try: () => Promise.resolve().then(() => logs.addLog({ action, data, userId, requestId: requestId ?? '' })),
    catch: cause => cause,
  })
}

// business -> response

function toDetails(row: NonNullable<Awaited<ReturnType<typeof getClusterDetailsQuery>>>) {
  const { infos, projects, stages, kubeconfig, secretName, kubeConfigId, createdAt, updatedAt, ...details } = row
  return { ...details, infos: infos ?? '', projectIds: projects.map(project => project.id), stageIds: stages.map(({ id }) => id), kubeconfig }
}

// pipelines

export function getClusterDetails(prisma: PrismaService, clusterId: string) {
  return Effect.gen(function* () {
    const row = yield* retried(Effect.tryPromise(() => getClusterDetailsQuery(prisma, clusterId)))
    if (!row) return yield* new ClusterNotFound({ clusterId })
    const kubeconfig = yield* decodeKubeconfig(row.kubeconfig)
    return { ...toDetails(row), kubeconfig } satisfies ClusterDetails
  })
}

export function listClusters(prisma: PrismaService, userId?: User['id']) {
  return retried(Effect.tryPromise(() => listClustersQuery(prisma, listClustersWhere(userId)))).pipe(
    Effect.map(clusters => clusters.map(({ stages, infos, secretName, kubeConfigId, createdAt, updatedAt, ...cluster }) => ({
      ...cluster,
      infos: infos ?? '',
      stageIds: stages.map(({ id }) => id),
    })) satisfies CleanedCluster[]),
  )
}

export function getClusterUsage(prisma: PrismaService, clusterId: string) {
  return retried(Effect.tryPromise(() => getClusterUsageQuery(prisma, clusterId)))
}

export function getClusterAssociatedEnvironments(prisma: PrismaService, clusterId: string) {
  return retried(Effect.tryPromise(() => getClusterEnvironments(prisma, clusterId))).pipe(
    Effect.map(environments => environments.map(environment => ({
      project: environment.project?.name,
      name: environment.name,
      owner: environment.project?.owner.email,
      cpu: environment.cpu,
      gpu: environment.gpu,
      memory: environment.memory,
    }))),
  )
}

export function createCluster(deps: ClusterDeps, data: CreateClusterBody, userId: User['id'], requestId: string) {
  return Effect.gen(function* () {
    yield* assertLabelFree(deps.prisma, data.label)
    const { clusterCreated, zoneId } = yield* createClusterRow(deps.prisma, data)
    yield* emitUpsertHook(deps, clusterCreated.id, zoneId)
    yield* addLog(deps, 'Create Cluster', { clusterId: clusterCreated.id, zoneId }, userId, requestId)
    return yield* getClusterDetails(deps.prisma, clusterCreated.id)
  })
}

export function updateCluster(deps: ClusterDeps, data: UpdateClusterBody, clusterId: string, userId: User['id'], requestId: string) {
  return Effect.gen(function* () {
    const dbCluster = yield* ensureClusterExists(deps.prisma, clusterId)
    const clusterUpdated = yield* updateClusterRow(deps.prisma, data, clusterId)
    yield* emitUpsertHook(deps, clusterId, dbCluster.zoneId)
    yield* addLog(deps, 'Update Cluster', { clusterId, zoneId: dbCluster.zoneId }, userId, requestId)
    void clusterUpdated
    return yield* getClusterDetails(deps.prisma, clusterId)
  })
}

export function deleteCluster(deps: ClusterDeps, clusterId: string, userId: User['id'], requestId: string, force?: boolean) {
  return Effect.gen(function* () {
    const message = yield* deleteClusterRow(deps.prisma, clusterId, force)
    if (message === 'active-environments') {
      return yield* new EnvironmentsActive({ clusterId })
    }
    yield* emitDeleteHook(deps, clusterId)
    yield* addLog(deps, 'Delete Cluster', { clusterId }, userId, requestId)
    return message
  })
}
