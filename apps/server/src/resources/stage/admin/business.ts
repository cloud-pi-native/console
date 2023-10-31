import { BadRequestError, DsoError } from '@/utils/errors.js'
import {
  getStageByName,
  createStage as createStageQuery,
  deleteStage as deleteStageQuery,
  getEnvironmentsByQuotaStageId,
  getStageById,
  linkStageToClusters,
  getQuotaById,
  removeClusterFromStage,
  linkStageToQuotas,
} from '@/resources/queries-index.js'
import { DeleteStageDto, CreateStageDto, UpdateStageClustersDto, stageSchema } from '@dso-console/shared'

export const getStageAssociatedEnvironments = async (stageId: DeleteStageDto['params']['stageId']) => {
  try {
    const stage = await getStageById(stageId)

    let environments = []
    for (const quotaStage of stage.quotaStage) {
      const quota = await getQuotaById(quotaStage.quotaId)
      environments = [...environments, ...(await getEnvironmentsByQuotaStageId(quotaStage.id))
        .map(environment => ({ ...environment, quota: quota.name }))]
    }
    environments = environments.map(environment => {
      return ({
        organization: environment?.project?.organization?.name,
        project: environment?.project?.name,
        name: environment?.name,
        quota: environment?.quota,
        cluster: environment?.cluster?.label,
        owner: environment?.project?.roles?.find(role => role?.role === 'owner')?.user?.email,
      })
    })

    return environments
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const createStage = async (data: CreateStageDto['body']) => {
  try {
    await stageSchema.validateAsync(data)

    const isNameTaken = await getStageByName(data.name)
    if (isNameTaken) throw new BadRequestError('Un stage portant ce nom existe déjà')

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

export const updateStageClusters = async (stageId: UpdateStageClustersDto['params']['stageId'], clusterIds: UpdateStageClustersDto['body']['clusterIds']) => {
  try {
    const dbClusters = (await getStageById(stageId)).clusters

    // Remove clusters
    const clustersToRemove = dbClusters.filter(dbCluster => !clusterIds.includes(dbCluster.id))
    for (const clusterToRemove of clustersToRemove) {
      await removeClusterFromStage(clusterToRemove.id, stageId)
    }
    // Add clusters
    await linkStageToClusters(stageId, clusterIds)
    const clusters = (await getStageById(stageId)).clusters

    return clusters
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const deleteStage = async (stageId: DeleteStageDto['params']['stageId']) => {
  try {
    const environments = await getStageAssociatedEnvironments(stageId)
    if (environments.length) throw new BadRequestError('Impossible de supprimer le stage, des environnements en activité y ont souscrit', { extras: environments })

    await deleteStageQuery(stageId)
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}
