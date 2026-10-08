import type {
  ClusterUsage,
  CreateClusterBody,
  UpdateClusterBody,
} from '@cpn-console/shared'
import type { ClusterEventName, ClusterEventPayload, EventContext } from '../events/app-events.service'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ClusterDetailsRecord, ClusterEnvironmentsRecord, ClusterListRecord } from './cluster-queries.utils'
import { AdminAuthorized, ClusterPrivacySchema } from '@cpn-console/shared'
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { AppEventsService } from '../events/app-events.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { getFailedPlugins } from '../plugin/plugin.utils'
import {
  createCluster,
  deleteCluster,
  generateClusterWhereInput,
  getClusterById,
  getClusterByLabel,
  getClusterDetails,
  getClusterEnvironments,
  getClusterUsage,
  linkClusterToProjects,
  linkClusterToStages,
  linkZoneToClusters,
  listClusters,
  syncClusterProjectLinks,
  syncClusterStageLinks,
  updateCluster,
} from './cluster-queries.utils'

const CLUSTER_PUBLIC = ClusterPrivacySchema.enum.public

@Injectable()
export class ClusterService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AppEventsService) private readonly appEvents: AppEventsService,
  ) {}

  async listClustersForUser(user: UserContext): Promise<ClusterListRecord[]> {
    return this.listClusters(AdminAuthorized.ListClusters(user.adminPermissions) ? undefined : user.userId)
  }

  private async listClusters(userId?: string): Promise<ClusterListRecord[]> {
    const where = generateClusterWhereInput(userId)
    return listClusters(this.prisma, where)
  }

  async getClusterDetailsRecord(clusterId: string): Promise<ClusterDetailsRecord> {
    return getClusterDetails(this.prisma, clusterId)
  }

  async getClusterUsage(clusterId: string): Promise<ClusterUsage> {
    return getClusterUsage(this.prisma, clusterId)
  }

  async getClusterAssociatedEnvironments(clusterId: string): Promise<ClusterEnvironmentsRecord[]> {
    return getClusterEnvironments(this.prisma, clusterId)
  }

  async createCluster(
    data: CreateClusterBody,
    userId: string,
    requestId: string,
  ): Promise<ClusterDetailsRecord> {
    const isLabelTaken = await getClusterByLabel(this.prisma, data.label)
    if (isLabelTaken) throw new ConflictException('Ce label existe déjà pour un autre cluster')

    const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data

    const clusterCreated = await this.prisma.$transaction(async (tx) => {
      const clusterCreated = await createCluster(tx, clusterData, kubeconfig, zoneId)

      if (data.privacy !== CLUSTER_PUBLIC && projectIds?.length) {
        await linkClusterToProjects(tx, clusterCreated.id, projectIds)
      }

      if (stageIds?.length) {
        await linkClusterToStages(tx, clusterCreated.id, stageIds)
      }

      return clusterCreated
    })

    await this.emitClusterEventAndThrowOnFailure('cluster.upsert', { clusterId: clusterCreated.id, zoneId }, {
      action: 'Create Cluster',
      userId,
      requestId,
    }, 'Echec des services à la création du cluster')

    return this.getClusterDetailsRecord(clusterCreated.id)
  }

  async updateCluster(
    data: UpdateClusterBody,
    clusterId: string,
    userId: string,
    requestId: string,
  ): Promise<ClusterDetailsRecord> {
    const dbCluster = await getClusterById(this.prisma, clusterId)
    if (!dbCluster) throw new NotFoundException('Cluster not found')

    const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data
    const publicProjectIds = data.privacy === CLUSTER_PUBLIC ? undefined : projectIds

    await this.prisma.$transaction(async (tx) => {
      const clusterUpdated = await updateCluster(tx, clusterId, clusterData, kubeconfig)

      if (zoneId) {
        await linkZoneToClusters(tx, zoneId, [clusterId])
      }

      await syncClusterProjectLinks(tx, clusterUpdated, clusterId, publicProjectIds)
      await syncClusterStageLinks(tx, clusterUpdated, clusterId, stageIds)
    })

    await this.emitClusterEventAndThrowOnFailure('cluster.upsert', { clusterId, zoneId: dbCluster.zoneId }, {
      action: 'Update Cluster',
      userId,
      requestId,
    }, 'Echec des services à la mise à jour du cluster')

    return this.getClusterDetailsRecord(clusterId)
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
  }): Promise<number> {
    const environment = await this.prisma.environment.findFirst({ where: { clusterId } })
    if (!force && environment) throw new BadRequestException('Impossible de supprimer le cluster, des environnements en activité y sont déployés')
    // Legacy criterion: the external cleanup decides success. The cluster row
    // and its (forced) environments only disappear once every plugin reported
    // OK — a KO leaves everything replayable instead of a 204 with a dangling
    // cluster.
    await this.emitClusterEventAndThrowOnFailure('cluster.delete', { clusterId }, {
      action: 'Delete Cluster',
      userId,
      requestId,
    }, 'Echec des services à la suppression du cluster')

    let forcedCount = 0
    if (force && environment) {
      const envs = await this.prisma.environment.deleteMany({ where: { clusterId } })
      forcedCount = envs.count
    }
    await deleteCluster(this.prisma, clusterId)
    return forcedCount
  }

  private async emitClusterEventAndThrowOnFailure(
    event: ClusterEventName,
    payload: ClusterEventPayload,
    context: EventContext,
    failureMessage: string,
  ): Promise<void> {
    const results = await this.appEvents.emitClusterEvent(event, payload, context)

    if (getFailedPlugins(results).length) {
      throw new UnprocessableEntityException(failureMessage)
    }
  }
}
