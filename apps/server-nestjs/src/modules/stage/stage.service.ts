import type { CreateStageBody, Stage, StageAssociatedEnvironments, UpdateStageBody } from '@cpn-console/shared'
import type { Cluster, Stage as StageDb } from '@prisma/client'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import {
  createStage as createStageQuery,
  deleteStage as deleteStageQuery,
  disconnectClusterFromStage,
  getAllStageIds,
  getStageAssociatedEnvironments,
  getStageAssociatedEnvironmentCount,
  getStageById,
  getStageByName,
  linkClusterToStages,
  linkStageToClusters,
  listStages as listStagesQuery,
  removeClusterFromStage,
  updateStageName,
} from './stage-queries.utils'

@Injectable()
export class StageService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listStages(): Promise<Stage[]> {
    const stages = await listStagesQuery(this.prisma)
    return stages.map(({ clusters, ...stage }) => ({
      ...stage,
      clusterIds: clusters.map(({ id }) => id),
    }))
  }

  async getStageAssociatedEnvironments(stageId: Stage['id']): Promise<StageAssociatedEnvironments> {
    const environments = await getStageAssociatedEnvironments(this.prisma, stageId)
    return environments.map(env => ({
      project: env.project.slug,
      name: env.name,
      cluster: env.cluster.label,
      owner: env.project.owner.email,
    }))
  }

  async createStage({ clusterIds = [], name }: CreateStageBody): Promise<Stage> {
    const isNameTaken = await getStageByName(this.prisma, name)
    if (isNameTaken) throw new BadRequestException('Un type d\'environnement portant ce nom existe déjà')

    const stage = await createStageQuery(this.prisma, { name })

    if (clusterIds.length) {
      await linkStageToClusters(this.prisma, stage.id, clusterIds)
    }

    return {
      id: stage.id,
      name: stage.name,
      clusterIds,
    }
  }

  async updateStage(stageId: Stage['id'], { clusterIds, name }: UpdateStageBody): Promise<Stage> {
    const dbStage = await getStageById(this.prisma, stageId)
    if (!dbStage) throw new NotFoundException()

    if (name !== undefined && name !== dbStage.name) {
      await updateStageName(this.prisma, stageId, name)
    }

    // Remove clusters no longer linked
    const dbClusters = dbStage.clusters
    if (dbClusters?.length) {
      const clustersToRemove = dbClusters.filter(dbCluster => !clusterIds.includes(dbCluster.id))
      for (const clusterToRemove of clustersToRemove) {
        await disconnectClusterFromStage(this.prisma, clusterToRemove.id, stageId)
      }
    }

    // Add clusters
    if (clusterIds.length) {
      await linkStageToClusters(this.prisma, stageId, clusterIds)
    }

    const updated = await getStageById(this.prisma, stageId)
    if (!updated) throw new NotFoundException()

    return {
      id: stageId,
      name: updated.name,
      clusterIds: updated.clusters.map(({ id }) => id),
    }
  }

  async deleteStage(stageId: Stage['id']): Promise<void> {
    const attachedEnvironmentCount = await getStageAssociatedEnvironmentCount(this.prisma, stageId)
    if (attachedEnvironmentCount > 0) {
      throw new BadRequestException('Impossible de supprimer le stage, des environnements en activité y ont souscrit')
    }

    await deleteStageQuery(this.prisma, stageId)
  }

  async linkClusterToStages(clusterId: Cluster['id'], stageIds: Stage['id'][]): Promise<void> {
    const allStageIds = stageIds.length ? stageIds : (await getAllStageIds(this.prisma)).map(({ id }) => id)
    await linkClusterToStages(this.prisma, clusterId, allStageIds)
    for (const stageId of allStageIds) {
      await removeClusterFromStage(this.prisma, clusterId, stageId)
    }
  }
}
