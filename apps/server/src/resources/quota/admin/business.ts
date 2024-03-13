import { BadRequestError, DsoError, NotFoundError } from '@/utils/errors.js'
import {
  getQuotaByName,
  createQuota as createQuotaQuery,
  linkQuotaToStages,
  getQuotaById,
  deleteQuota as deleteQuotaQuery,
  getEnvironmentsByQuotaStageId,
  getStageById,
  linkStageToQuotas,
  deleteQuotaStage,
  updateQuotaPrivacy as updateQuotaPrivacyQuery,
} from '@/resources/queries-index.js'
import { type CreateQuotaDto, QuotaSchema, type UpdateQuotaStageDto, type UpdateQuotaPrivacyDto, type QuotaParams, type QuotaStageModel } from '@cpn-console/shared'
import { validateSchema } from '@/utils/business.js'

export const getQuotaAssociatedEnvironments = async (quotaId: QuotaParams['quotaId']) => {
  try {
    const quota = await getQuotaById(quotaId)
    if (!quota) throw new NotFoundError('Quota introuvable')

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
      stage?: string,
    }[] = []
    for (const quotaStage of quota.quotaStage) {
      const stage = await getStageById(quotaStage.stageId)
      environments = [...environments, ...(await getEnvironmentsByQuotaStageId(quotaStage.id))
        .map(environment => ({ ...environment, stage: stage?.name }))]
    }
    const mappedEnvironments: {
      project?: string,
      organization?: string,
      name?: string,
      stage?: string,
      owner?: string,
    }[] = environments.map(environment => {
      return {
        organization: environment?.project?.organization?.name,
        project: environment?.project?.name,
        name: environment?.name,
        stage: environment?.stage,
        owner: environment?.project?.roles?.find(role => role?.role === 'owner')?.user?.email,
      }
    })

    return mappedEnvironments
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const createQuota = async (data: CreateQuotaDto) => {
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

export const updateQuotaPrivacy = async (quotaId: QuotaParams['quotaId'], isPrivate: UpdateQuotaPrivacyDto['isPrivate']) => {
  try {
    return await updateQuotaPrivacyQuery(quotaId, isPrivate)
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const updateQuotaStage = async (data: UpdateQuotaStageDto) => {
  try {
    let quotaStages: QuotaStageModel[] | undefined = []

    // From quotaId and stageIds
    if (data.quotaId && data.stageIds) {
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
      quotaStages = (await getQuotaById(data.quotaId))?.quotaStage
    }

    // From stageId and quotaIds
    if (data.stageId && data.quotaIds) {
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
      quotaStages = (await getStageById(data.stageId))?.quotaStage
    }

    return quotaStages
  } catch (error) {
    if (error.message.match(/Foreign key constraint failed on the field: `Environment_quotaStageId_fkey/)) {
      throw new BadRequestError('L\'association quota / type d\'environnement que vous souhaitez supprimer est actuellement utilisée. Vous pouvez demander aux souscripteurs concernés de changer le quota choisi pour leur environnement.')
    }
    throw new Error(error?.message)
  }
}

export const deleteQuota = async (quotaId: QuotaParams['quotaId']) => {
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
