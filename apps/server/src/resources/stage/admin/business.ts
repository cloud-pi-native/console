import type { Stage } from '@prisma/client'
import { type CreateStageBody, type UpdateStageClustersBody, StageSchema } from '@cpn-console/shared'
import { BadRequestError, DsoError } from '@/utils/errors.js'
import {
  getStageByName,
  createStage as createStageQuery,
  deleteStage as deleteStageQuery,
  getStageById,
  linkStageToClusters,
  removeClusterFromStage,
  linkStageToQuotas,
  getStageAssociatedEnvironmentById,
  getStageByIdOrThrow,
  getStageAssociatedEnvironmentLengthById,
} from '@/resources/queries-index.js'
import { validateSchema } from '@/utils/business.js'

export const getStageAssociatedEnvironments = async (stageId: Stage['id']) => {
  try {
    const stage = await getStageById(stageId)
    if (!stage) throw new BadRequestError(`Le stage ${stageId} n'existe pas`)
    const environments = await getStageAssociatedEnvironmentById(stageId)
    return environments.map(env => ({
      organization: env.project.organization.name,
      project: env.project.name,
      name: env.name,
      quota: env.quotaStage.quota.name,
      cluster: env.cluster.label,
      owner: env.project.roles?.[0].user.email,
    }))
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const createStage = async (data: CreateStageBody) => {
  try {
    const schemaValidation = StageSchema.omit({ id: true }).safeParse(data)
    validateSchema(schemaValidation)

    const isNameTaken = await getStageByName(data.name)
    if (isNameTaken) throw new BadRequestError('Un type d\'environnement portant ce nom existe déjà')

    const stage = await createStageQuery(data)

    if (data.quotaIds) {
      await linkStageToQuotas(stage.id, data.quotaIds)
    }

    if (data.clusterIds) {
      await linkStageToClusters(stage.id, data.clusterIds)
    }

    return stage
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const updateStageClusters = async (stageId: Stage['id'], clusterIds: UpdateStageClustersBody['clusterIds']) => {
  try {
    // Remove clusters
    const dbClusters = (await getStageById(stageId))?.clusters
    if (dbClusters?.length) {
      const clustersToRemove = dbClusters.filter(dbCluster => !clusterIds.includes(dbCluster.id))
      for (const clusterToRemove of clustersToRemove) {
        await removeClusterFromStage(clusterToRemove.id, stageId)
      }
    }
    // Add clusters
    await linkStageToClusters(stageId, clusterIds)

    return (await getStageByIdOrThrow(stageId)).clusters
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
