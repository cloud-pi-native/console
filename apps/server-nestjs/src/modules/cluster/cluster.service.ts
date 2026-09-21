import type { CleanedCluster, ClusterDetails, ClusterUsage, CreateClusterBody, UpdateClusterBody } from '@cpn-console/shared'
import type { ConfigType } from '@nestjs/config'
import type { EventEmitter2 } from '@nestjs/event-emitter'
import type { LogService } from '../log/log.service'
import { ClusterPrivacySchema, KubeconfigSchema } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { Data, Effect } from 'effect'
import { baseConfigFactory } from '../../config/base.config'
import { retried } from '../../utils/effect.utils'
import { PrismaService } from '../infrastructure/database/prisma.service'
import {
  clusterDetailsSelect,
  clusterEnvironmentsSelect,
  clusterListSelect,
  createCluster as createClusterQuery,
  deleteCluster as deleteClusterQuery,
  generateClusterWhereInput,
  getProjectsByClusterId,
  linkClusterToProjects,
  linkClusterToStages,
  linkZoneToClusters,
  listStagesByClusterId,
  removeClusterFromProject,
  removeClusterFromStage,
  updateCluster as updateClusterQuery,
} from './cluster-queries.utils'

export class ClusterNotFound extends Data.TaggedError('ClusterNotFound')<{ clusterId: string }> {}
export class LabelTaken extends Data.TaggedError('LabelTaken')<{ label: string }> {}
export class EnvironmentsActive extends Data.TaggedError('EnvironmentsActive')<{ clusterId: string }> {}
export class HookFailed extends Data.TaggedError('HookFailed')<{ clusterId: string, cause: unknown }> {}

@Injectable()
export class ClusterService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logs: LogService,
    @Inject(baseConfigFactory.KEY) _baseConfig: ConfigType<typeof baseConfigFactory>,
  ) {}

  private assertLabelFree(label: string) {
    return Effect.flatMap(this.getClusterByLabel(label), row => row ? Effect.fail(new LabelTaken({ label })) : Effect.void)
  }

  private getClusterByLabel(label: string) {
    return Effect.promise(() => this.prisma.cluster.findUnique({ where: { label } }))
  }

  private ensureClusterExists(clusterId: string) {
    return Effect.promise(() => this.prisma.cluster.findUnique({
      where: { id: clusterId },
      include: { kubeconfig: true },
    })).pipe(
      retried,
      Effect.filterOrFail(dbCluster => dbCluster !== null, () => new ClusterNotFound({ clusterId })),
    )
  }

  private decodeKubeconfig(kubeconfig: { cluster: unknown, user: unknown }) {
    return Effect.try({
      try: () => ({
        cluster: KubeconfigSchema.shape.cluster.passthrough().parse(kubeconfig.cluster),
        user: KubeconfigSchema.shape.user.passthrough().parse(kubeconfig.user),
      }),
      catch: cause => cause,
    })
  }

  private createClusterRow(data: CreateClusterBody) {
    const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data
    return Effect.promise(() => this.prisma.$transaction(async (tx) => {
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

  private updateClusterRow(data: UpdateClusterBody, clusterId: string) {
    const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data
    return Effect.promise(() => this.prisma.$transaction(async (tx) => {
      const clusterUpdated = await updateClusterQuery(tx, clusterId, clusterData, kubeconfig)
      if (zoneId) {
        await linkZoneToClusters(tx, zoneId, [clusterId])
      }
      const dbProjects = await getProjectsByClusterId(tx, clusterId)
      let projectsToRemove: string[] = []
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

  private deleteClusterRow(clusterId: string, force?: boolean) {
    return Effect.promise(() => this.prisma.$transaction(async (tx) => {
      if (force) {
        const envs = await tx.environment.deleteMany({ where: { clusterId } })
        return { deleted: true, message: `${envs.count} environnements supprimés de force, n'oubliez pas de reprovisionner les projets concernés` }
      }
      const environment = await tx.environment.findFirst({ where: { clusterId } })
      if (environment) return { deleted: false, message: null }
      await deleteClusterQuery(tx, clusterId)
      return { deleted: true, message: null }
    }))
  }

  private emitUpsertHook(clusterId: string, zoneId: string) {
    return Effect.tryPromise({
      try: () => this.eventEmitter.emitAsync('cluster.upsert', { clusterId, zoneId }),
      catch: cause => new HookFailed({ clusterId, cause }),
    })
  }

  private emitDeleteHook(clusterId: string) {
    return Effect.catchAll(
      Effect.tryPromise({
        try: () => this.eventEmitter.emitAsync('cluster.delete', { clusterId }),
        catch: cause => cause,
      }),
      () => Effect.void,
    )
  }

  private addLog(action: string, data: Record<string, unknown>, userId?: string, requestId?: string) {
    return Effect.tryPromise({
      try: () => this.logs.addLog({ action, data, userId, requestId: requestId ?? '' }),
      catch: cause => cause,
    })
  }

  private getClusterDetailsRecord(clusterId: string) {
    return Effect.promise(() => this.prisma.cluster.findUniqueOrThrow({
      where: { id: clusterId },
      select: clusterDetailsSelect,
    }))
  }

  listClusters(userId?: string): Effect.Effect<CleanedCluster[], unknown> {
    return retried(Effect.promise(() => this.prisma.cluster.findMany({
      where: generateClusterWhereInput(userId),
      select: clusterListSelect,
    }))).pipe(
      Effect.map(clusters => clusters.map(({ stages, infos, secretName, kubeConfigId, createdAt, updatedAt, ...cluster }) => ({
        ...cluster,
        infos: infos ?? '',
        stageIds: stages.map(({ id }) => id),
      })) satisfies CleanedCluster[]),
    )
  }

  getClusterDetails(clusterId: string): Effect.Effect<ClusterDetails, unknown> {
    return Effect.gen(this, function* (this: ClusterService) {
      const row = yield* retried(this.getClusterDetailsRecord(clusterId))
      if (!row) return yield* new ClusterNotFound({ clusterId })
      const kubeconfig = yield* this.decodeKubeconfig(row.kubeconfig)
      const { projects, stages, kubeconfig: rawKubeconfig, secretName, kubeConfigId, createdAt, updatedAt, ...details } = row
      return { ...details, infos: row.infos ?? '', projectIds: projects.map(project => project.id), stageIds: stages.map(({ id }) => id), kubeconfig } satisfies ClusterDetails
    })
  }

  getClusterUsage(clusterId: string): Effect.Effect<ClusterUsage, unknown> {
    return retried(Effect.promise(() => this.prisma.environment.aggregate({
      _sum: { memory: true, cpu: true, gpu: true },
      where: { clusterId },
    }))).pipe(
      Effect.map(clusterUsage => ({
        cpu: clusterUsage._sum.cpu ?? 0,
        gpu: clusterUsage._sum.gpu ?? 0,
        memory: clusterUsage._sum.memory ?? 0,
      })),
    )
  }

  getClusterAssociatedEnvironments(clusterId: string) {
    return retried(Effect.promise(() => this.prisma.environment.findMany({
      where: { clusterId },
      select: clusterEnvironmentsSelect,
    }))).pipe(
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

  createCluster(data: CreateClusterBody, userId: string, requestId: string): Effect.Effect<ClusterDetails, unknown> {
    return Effect.gen(this, function* (this: ClusterService) {
      yield* this.assertLabelFree(data.label)
      const { clusterCreated, zoneId } = yield* this.createClusterRow(data)
      yield* this.emitUpsertHook(clusterCreated.id, zoneId)
      yield* this.addLog('Create Cluster', { clusterId: clusterCreated.id, zoneId }, userId, requestId)
      return yield* this.getClusterDetails(clusterCreated.id)
    })
  }

  updateCluster(data: UpdateClusterBody, clusterId: string, userId: string, requestId: string): Effect.Effect<ClusterDetails, unknown> {
    return Effect.gen(this, function* (this: ClusterService) {
      const dbCluster = yield* this.ensureClusterExists(clusterId)
      yield* this.updateClusterRow(data, clusterId)
      yield* this.emitUpsertHook(clusterId, dbCluster.zoneId)
      yield* this.addLog('Update Cluster', { clusterId, zoneId: dbCluster.zoneId }, userId, requestId)
      return yield* this.getClusterDetails(clusterId)
    })
  }

  deleteCluster({ clusterId, userId, requestId, force }: {
    clusterId: string
    userId?: string
    requestId: string
    force?: boolean
  }): Effect.Effect<string | null, unknown> {
    return Effect.gen(this, function* (this: ClusterService) {
      const { deleted, message } = yield* this.deleteClusterRow(clusterId, force)
      if (!deleted) {
        return yield* new EnvironmentsActive({ clusterId })
      }
      yield* this.emitDeleteHook(clusterId)
      yield* this.addLog('Delete Cluster', { clusterId }, userId, requestId)
      return message
    })
  }
}
