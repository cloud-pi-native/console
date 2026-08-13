import {
  CleanedCluster,
  ClusterAssociatedEnvironments,
  ClusterDetails,
  ClusterPrivacySchema,
  CreateClusterBody,
  KubeconfigSchema,
  UpdateClusterBody,
} from '@cpn-console/shared'
import type { Prisma, Project, User } from '@prisma/client'
import type { ClientInferResponseBody } from '@ts-rest/core'
import type { ConfigType } from '@nestjs/config'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { baseConfigFactory } from '../../config/base.config'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import {
  createCluster as createClusterQuery,
  deleteCluster as deleteClusterQuery,
  getClusterById,
  getClusterByLabel,
  getClusterDetails as getClusterDetailsQuery,
  getClusterEnvironments,
  getClusterUsage,
  getProjectsByClusterId,
  linkClusterToProjects,
  linkClusterToStages,
  linkZoneToClusters,
  listClusters as listClustersQuery,
  listStagesByClusterId,
  removeClusterFromProject,
  removeClusterFromStage,
  updateCluster as updateClusterQuery,
} from './cluster-queries.utils'
import { clusterContract } from '@cpn-console/shared'

type ClusterUsage = ClientInferResponseBody<typeof clusterContract.getClusterUsage, 200>

const CLUSTER_PUBLIC = ClusterPrivacySchema.enum.public
const CLUSTER_DEDICATED = ClusterPrivacySchema.enum.dedicated

@Injectable()
export class ClusterService {
  private readonly logger = new Logger(ClusterService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(LogService) private readonly logs: LogService,
    @Inject(baseConfigFactory.KEY) private readonly baseConfig: ConfigType<typeof baseConfigFactory>,
  ) {}

  async listClusters(userId?: User['id']): Promise<CleanedCluster[]> {
    const where: Prisma.ClusterWhereInput = userId
      ? {
          OR: [
            { privacy: CLUSTER_PUBLIC },
            { projects: { some: { members: { some: { userId } } } } },
            { projects: { some: { ownerId: userId } } },
            { environments: { some: { project: { members: { some: { userId } } } } } },
          ],
        }
      : {}
    const clusters = await listClustersQuery(this.prisma, where)
    return clusters.map(({ stages, infos, secretName, kubeConfigId, createdAt, updatedAt, ...cluster }) => ({
      ...cluster,
      infos: infos ?? '',
      stageIds: stages.map(({ id }) => id),
    }))
  }

  async getClusterDetails(clusterId: string): Promise<ClusterDetails> {
    const { infos, projects, stages, kubeconfig, secretName, kubeConfigId, createdAt, updatedAt, ...details } = await getClusterDetailsQuery(this.prisma, clusterId)
    return {
      ...details,
      infos: infos ?? '',
      projectIds: projects.map(project => project.id),
      stageIds: stages.map(({ id }) => id),
      kubeconfig: {
        cluster: KubeconfigSchema.shape.cluster.parse(kubeconfig.cluster),
        user: KubeconfigSchema.shape.user.parse(kubeconfig.user),
      },
    }
  }

  async getClusterUsage(clusterId: string): Promise<ClusterUsage> {
    return getClusterUsage(this.prisma, clusterId)
  }

  async getClusterAssociatedEnvironments(clusterId: string): Promise<ClusterAssociatedEnvironments> {
    const clusterEnvironments = await getClusterEnvironments(this.prisma, clusterId)
    return clusterEnvironments.map((environment) => ({
      project: environment.project?.name,
      name: environment.name,
      owner: environment.project?.owner.email,
      cpu: environment.cpu,
      gpu: environment.gpu,
      memory: environment.memory,
    }))
  }

  async createCluster(
    data: CreateClusterBody,
    userId: User['id'],
    requestId: string,
  ): Promise<ClusterDetails> {
    const isLabelTaken = await getClusterByLabel(this.prisma, data.label)
    if (isLabelTaken) throw new Error('Ce label existe déjà pour un autre cluster')

    const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data

    const clusterCreated = await createClusterQuery(this.prisma, clusterData, kubeconfig, zoneId)

    if (data.privacy === CLUSTER_PUBLIC) {
      // no project linking for public clusters
    } else if (projectIds?.length) {
      await linkClusterToProjects(this.prisma, clusterCreated.id, projectIds)
    }

    if (stageIds?.length) {
      await linkClusterToStages(this.prisma, clusterCreated.id, stageIds)
    }

    await this.upsertClusterHook(clusterCreated.id)
    await this.logs.addLog({
      action: 'Create Cluster',
      data: { clusterId: clusterCreated.id, zoneId },
      userId,
      requestId,
    })

    return this.getClusterDetails(clusterCreated.id)
  }

  async updateCluster(
    data: UpdateClusterBody,
    clusterId: string,
    userId: User['id'],
    requestId: string,
  ): Promise<ClusterDetails> {
    if (data?.privacy === CLUSTER_PUBLIC) delete data.projectIds

    const dbCluster = await getClusterById(this.prisma, clusterId)
    if (!dbCluster) throw new Error('Cluster not found')

    const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data

    const clusterUpdated = await updateClusterQuery(this.prisma, clusterId, clusterData,
      // @ts-ignore
      kubeconfig)

    if (zoneId) {
      await linkZoneToClusters(this.prisma, zoneId, [clusterId])
    }

    const dbProjects = await getProjectsByClusterId(this.prisma, clusterId)

    let projectsToRemove: Project['id'][] = []

    if (projectIds && clusterUpdated.privacy === CLUSTER_PUBLIC) {
      projectsToRemove = dbProjects?.map(project => project.id) ?? []
    } else if (projectIds && clusterUpdated.privacy === CLUSTER_DEDICATED) {
      await linkClusterToProjects(this.prisma, clusterId, projectIds)
      projectsToRemove = dbProjects?.map(project => project.id)?.filter(dbProjectId => !projectIds.includes(dbProjectId)) ?? []
    } else if (clusterUpdated.privacy === CLUSTER_PUBLIC) {
      projectsToRemove = dbProjects?.map(project => project.id) ?? []
    }

    for (const projectId of projectsToRemove) {
      await removeClusterFromProject(this.prisma, clusterUpdated.id, projectId)
    }

    if (stageIds) {
      await linkClusterToStages(this.prisma, clusterId, stageIds)

      const dbStages = await listStagesByClusterId(this.prisma, clusterId)
      if (dbStages) {
        for (const stage of dbStages) {
          if (!stageIds.includes(stage.id)) {
            await removeClusterFromStage(this.prisma, clusterUpdated.id, stage.id)
          }
        }
      }
    }

    await this.upsertClusterHook(clusterId)
    await this.logs.addLog({
      action: 'Update Cluster',
      data: { clusterId },
      userId,
      requestId,
    })

    return this.getClusterDetails(clusterId)
  }

  async deleteCluster({
    clusterId,
    userId,
    requestId,
    force,
  }: {
    clusterId: string
    userId?: string
    requestId: string
    force?: boolean
  }): Promise<string | null> {
    let message: string | null = null
    if (force) {
      const envs = await this.prisma.environment.deleteMany({
        where: { clusterId },
      })
      message = `${envs.count} environnements supprimés de force, n'oubliez pas de reprovisionner les projets concernés`
    } else {
      const environment = await this.prisma.environment.findFirst({ where: { clusterId } })
      if (environment) throw new Error('Impossible de supprimer le cluster, des environnements en activité y sont déployés')
    }

    await this.deleteClusterHook(clusterId)
    await this.logs.addLog({
      action: 'Delete Cluster',
      data: { clusterId },
      userId,
      requestId,
    })

    await deleteClusterQuery(this.prisma, clusterId)
    return message
  }

  // ── Cluster hook helpers ────────────────────────────────────────────────────────

  private async upsertClusterHook(clusterId: string): Promise<void> {
    try {
      await this.eventEmitter.emitAsync('cluster.upsert', { clusterId })
    } catch (error) {
      this.logger.error(`cluster.upsert hook failed (clusterId=${clusterId})`, error instanceof Error ? error.stack : String(error))
    }
  }

  private async deleteClusterHook(clusterId: string): Promise<void> {
    try {
      await this.eventEmitter.emitAsync('cluster.delete', { clusterId })
    } catch (error) {
      this.logger.error(`cluster.delete hook failed (clusterId=${clusterId})`, error instanceof Error ? error.stack : String(error))
    }
  }
}
