import type { Stage, Cluster, User } from '@prisma/client'
import { type CreateStageBody, UpdateStageBody } from '@cpn-console/shared'
import { BadRequestError, DsoError, NotFoundError, UnauthorizedError } from '@/utils/errors.js'
import {
  getStageByName,
  createStage as createStageQuery,
  deleteStage as deleteStageQuery,
  getStageById,
  linkStageToClusters,
  removeClusterFromStage,
  linkStageToQuotas,
  getStageAssociatedEnvironmentById,
  getStageAssociatedEnvironmentLengthById,
  updateStageName,
  unlinkStageFromQuotas,
} from '@/resources/queries-index.js'

import {
  getUserById,
  listStages as listStagesQuery,
  linkClusterToStages as linkClusterToStagesQuery,
  getAllStageIds,
} from '../queries-index.js'

export const getStageAssociatedEnvironments = async (stageId: Stage['id']) => {
  try {
    const stage = await getStageById(stageId)
    if (!stage) throw new BadRequestError(`Le stage ${stageId} n'existe pas`)
    const environments = await getStageAssociatedEnvironmentById(stageId)
    return environments.map(env => ({
      organization: env.project.organization.name,
      project: env.project.name,
      name: env.name,
      quota: env.quota.name,
      cluster: env.cluster.label,
      owner: env.project.roles?.[0].user.email,
    }))
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const createStage = async ({ clusterIds = [], name, quotaIds = [] }: CreateStageBody) => {
  try {
    const isNameTaken = await getStageByName(name)
    if (isNameTaken) throw new BadRequestError('Un type d\'environnement portant ce nom existe déjà')

    const stage = await createStageQuery({ name })

    if (quotaIds.length) {
      await linkStageToQuotas(stage.id, quotaIds)
    }

    if (clusterIds.length) {
      await linkStageToClusters(stage.id, clusterIds)
    }

    return {
      id: stage.id,
      name: stage.name,
      clusterIds,
      quotaIds,
    }
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const updateStage = async (stageId: Stage['id'], { clusterIds, name, quotaIds }: UpdateStageBody) => {
  try {
    const dbStage = await getStageById(stageId)
    if (!dbStage) throw new NotFoundError('Stage introuvable')
    if (name === dbStage.name) {
      await updateStageName(stageId, name)
    }
    // Remove clusters
    if (clusterIds) {
      const dbClusters = dbStage.clusters
      if (dbClusters?.length) {
        const clustersToRemove = dbClusters.filter(dbCluster => !clusterIds.includes(dbCluster.id))
        for (const clusterToRemove of clustersToRemove) {
          await removeClusterFromStage(clusterToRemove.id, stageId)
        }
      }
      // Add clusters
      await linkStageToClusters(stageId, clusterIds)
    }

    if (quotaIds) {
      const dbQuotas = dbStage.quotas
      const quotaIdsToRemove = dbQuotas
        .filter(({ id }) => !quotaIds.includes(id))
        .map(({ id }) => id)

      if (quotaIdsToRemove.length) {
        await unlinkStageFromQuotas(stageId, quotaIdsToRemove)
      }
      const quotaIdsToAdd = quotaIds
        .filter(quotaIdToAdd => !dbQuotas.find(({ id }) => id === quotaIdToAdd))
      if (quotaIdsToAdd.length) {
        await linkStageToQuotas(stageId, quotaIdsToAdd)
      }
    }

    return {
      id: stageId,
      name: name ?? dbStage.name,
      clusterIds: clusterIds ?? dbStage.clusters.map(({ id }) => id),
      quotaIds: quotaIds ?? dbStage.quotas.map(({ id }) => id),
    }
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const deleteStage = async (stageId: Stage['id']) => {
  try {
    const environments = await getStageAssociatedEnvironmentLengthById(stageId)
    if (environments) throw new BadRequestError('Impossible de supprimer le stage, des environnements en activité y ont souscrit')

    await deleteStageQuery(stageId)
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const listStages = async (userId: User['id']) => {
  const user = await getUserById(userId)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')
  const stages = await listStagesQuery()

  return stages.map(stage => {
    return {
      id: stage.id,
      name: stage.name,
      quotaIds: stage.quotas.map(({ id }) => id),
      clusterIds: stage.clusters.map(({ id }) => id),
    }
  })
}

export const linkClusterToStages = async (clusterId: Cluster['id'], stageIds: Stage['id'][], linkToAll: boolean = false) => {
  if (linkToAll === true) {
    stageIds = await getAllStageIds()
  }
  await linkClusterToStagesQuery(clusterId, stageIds)
}
