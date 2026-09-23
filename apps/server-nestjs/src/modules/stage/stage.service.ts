import type { CreateStageBody, Stage, StageAssociatedEnvironments, UpdateStageBody } from '@cpn-console/shared'
import type { Cluster } from '@prisma/client'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import {
  createStage as createStageQuery,
  deleteStage as deleteStageQuery,
  disconnectClusterFromStage,
  getAllStageIds,
  getStageAssociatedEnvironmentCount,
  getStageAssociatedEnvironments,
  getStageById,
  getStageByName,
  linkClusterToStages,
  linkStageToClusters,
  listStages as listStagesQuery,
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
    return this.prisma.$transaction(async (tx) => {
      const isNameTaken = await getStageByName(tx, name)
      if (isNameTaken) throw new BadRequestException('Un type d\'environnement portant ce nom existe déjà')

      const stage = await createStageQuery(tx, { name })

      if (clusterIds.length) {
        await linkStageToClusters(tx, stage.id, clusterIds)
      }

      return {
        id: stage.id,
        name: stage.name,
        clusterIds,
      }
    })
  }

  async updateStage(stageId: Stage['id'], { clusterIds, name }: UpdateStageBody): Promise<Stage> {
    return this.prisma.$transaction(async (tx) => {
      const dbStage = await getStageById(tx, stageId)
      if (!dbStage) throw new NotFoundException()

      if (name !== undefined && name !== dbStage.name) {
        await updateStageName(tx, stageId, name)
      }

      const dbClusters = dbStage.clusters
      if (dbClusters?.length) {
        const clustersToRemove = dbClusters.filter(dbCluster => !clusterIds.includes(dbCluster.id))
        for (const clusterToRemove of clustersToRemove) {
          await disconnectClusterFromStage(tx, clusterToRemove.id, stageId)
        }
      }

      if (clusterIds.length) {
        await linkStageToClusters(tx, stageId, clusterIds)
      }

      const updated = await getStageById(tx, stageId)
      if (!updated) throw new NotFoundException()

      return {
        id: stageId,
        name: updated.name,
        clusterIds: updated.clusters.map(({ id }) => id),
      }
    })
  }

  async deleteStage(stageId: Stage['id']): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const attachedEnvironmentCount = await getStageAssociatedEnvironmentCount(tx, stageId)
      if (attachedEnvironmentCount > 0) {
        throw new BadRequestException('Impossible de supprimer le stage, des environnements en activité y ont souscrit')
      }

      await deleteStageQuery(tx, stageId)
    })
  }

  async linkClusterToStages(clusterId: Cluster['id'], stageIds: Stage['id'][], linkToAll: boolean = false): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (linkToAll === true) {
        stageIds = (await getAllStageIds(tx)).map(({ id }) => id)
      }
      await linkClusterToStages(tx, clusterId, stageIds)
    })
  }
}
