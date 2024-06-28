import { BadRequestError, DsoError, NotFoundError } from '@/utils/errors.js'
import {
  getQuotaByName,
  createQuota as createQuotaQuery,
  linkQuotaToStages,
  getQuotaById,
  deleteQuota as deleteQuotaQuery,
  getStageById,
  linkStageToQuotas,
  deleteQuotaStage,
  updateQuotaPrivacy as updateQuotaPrivacyQuery,
  getQuotaAssociatedEnvironmentById,
  getStageByIdOrThrow,
  getQuotaByIdOrThrow,
} from '@/resources/queries-index.js'
import { type CreateQuotaBody, QuotaSchema, type UpdateQuotaStageBody, type PatchQuotaBody } from '@cpn-console/shared'
import { validateSchema } from '@/utils/business.js'

export const getQuotaAssociatedEnvironments = async (quotaId: string) => {
  try {
    const quota = await getQuotaById(quotaId)
    if (!quota) throw new NotFoundError('Quota introuvable')
    const environments = await getQuotaAssociatedEnvironmentById(quotaId)
    return environments.map(env => ({
      name: env.name,
      project: env.project.name,
      organization: env.project.organization.name,
      stage: env.quotaStage.stage.name,
      owner: env.project.roles?.[0].user.email,
    }))
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const createQuota = async (data: CreateQuotaBody) => {
  try {
    const schemaValidation = QuotaSchema.omit({ id: true }).safeParse(data)
    validateSchema(schemaValidation)

    const isNameTaken = await getQuotaByName(data.name)
    if (isNameTaken) throw new BadRequestError('Un quota portant ce nom existe déjà')

    const quota = await createQuotaQuery(data)

    if (data.stageIds) {
      await linkQuotaToStages(quota.id, data.stageIds)
    }

    return quota
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const updateQuotaPrivacy = async (quotaId: string, isPrivate: PatchQuotaBody['isPrivate']) => {
  try {
    return await updateQuotaPrivacyQuery(quotaId, isPrivate)
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const updateQuotaStage = async (data: UpdateQuotaStageBody) => {
  try {
    // From quotaId and stageIds
    if (data.quotaId) {
      // Remove quotaStages
      const dbQuotaStages = (await getQuotaById(data.quotaId))?.quotaStage
      const quotaStagesToRemove = dbQuotaStages?.filter(dbQuotaStage => !data.stageIds?.includes(dbQuotaStage.stageId))
      if (quotaStagesToRemove) {
        for (const quotaStageToRemove of quotaStagesToRemove) {
          await deleteQuotaStage(quotaStageToRemove.id)
        }
      }
      // Create quotaStages
      await linkQuotaToStages(data.quotaId, data.stageIds)
      return (await getQuotaByIdOrThrow(data.quotaId)).quotaStage
    }

    // From stageId and quotaIds
    if (data.stageId) {
      // Remove quotaStages
      const dbQuotaStages = (await getStageById(data.stageId))?.quotaStage
      const quotaStagesToRemove = dbQuotaStages?.filter(dbQuotaStage => !data.quotaIds?.includes(dbQuotaStage.quotaId))
      if (quotaStagesToRemove) {
        for (const quotaStageToRemove of quotaStagesToRemove) {
          await deleteQuotaStage(quotaStageToRemove.id)
        }
      }
      // Create quotaStages
      await linkStageToQuotas(data.stageId, data.quotaIds)
      return (await getStageByIdOrThrow(data.stageId)).quotaStage
    }
    throw new BadRequestError('Need to specify either quotaId and stageIds or stageId and quotaIds')
  } catch (error) {
    if (error.message.match(/Foreign key constraint failed on the field: `Environment_quotaStageId_fkey/)) {
      throw new BadRequestError('L\'association quota / type d\'environnement que vous souhaitez supprimer est actuellement utilisée. Vous pouvez demander aux souscripteurs concernés de changer le quota choisi pour leur environnement.')
    }
    throw new Error(error?.message)
  }
}

export const deleteQuota = async (quotaId: string) => {
  try {
    const environments = await getQuotaAssociatedEnvironments(quotaId)
    if (environments.length) throw new BadRequestError('Impossible de supprimer le quota, des environnements en activité y ont souscrit', { extras: environments })

    await deleteQuotaQuery(quotaId)
  } catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}
