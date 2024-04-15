import type { Stage } from '@prisma/client'
import { type CreateStageBody, type UpdateStageClustersBody, StageSchema } from '@cpn-console/shared'
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
import { validateSchema } from '@/utils/business.js'

export const getStageAssociatedEnvironments = async (stageId: Stage['id']) => {
  try {
    const stage = await getStageById(stageId)
    if (!stage) throw new BadRequestError(`Le stage ${stageId} n'existe pas`)

    let environments: {
      project: {
        name: string,
        organization: {
          name: string,
        },
        roles: {
          role: string,
          user: {
            email: string,
          }
        }[],
      },
      name: string,
      cluster: {
        label: string,
      },
      quota?: string,
    }[] = []

    for (const quotaStage of stage.quotaStage) {
      const quota = await getQuotaById(quotaStage.quotaId)
      environments = [...environments, ...(await getEnvironmentsByQuotaStageId(quotaStage.id))
        .map(environment => ({ ...environment, quota: quota?.name }))]
    }

    const mappedEnvironments: {
      project?: string,
      organization?: string,
      name?: string,
      quota?: string,
      cluster?: string,
      owner?: string,
    }[] = environments.map(environment => {
      return {
        organization: environment?.project?.organization?.name,
        project: environment?.project?.name,
        name: environment?.name,
        quota: environment?.quota,
        cluster: environment?.cluster?.label,
        owner: environment?.project?.roles?.find(role => role?.role === 'owner')?.user?.email,
      }
    })

    return mappedEnvironments
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
    const clusters = (await getStageById(stageId))?.clusters

    return clusters
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const deleteStage = async (stageId: Stage['id']) => {
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
