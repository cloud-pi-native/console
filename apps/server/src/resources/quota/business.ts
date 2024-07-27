import { type Quota } from '@prisma/client'
import { type CreateQuotaBody, QuotaSchema, type UpdateQuotaBody, type Quota as QuotaDto } from '@cpn-console/shared'
import { BadRequestError, DsoError, NotFoundError } from '@/utils/errors.js'
import {
  getQuotaByName,
  createQuota as createQuotaQuery,
  linkQuotaToStages,
  getQuotaById,
  deleteQuota as deleteQuotaQuery,
  updateQuotaPrivacy as updateQuotaPrivacyQuery,
  getQuotaAssociatedEnvironmentById,
  updateQuotaName,
  updateQuotaLimits,
  unlinkQuotaFromStages,
} from '@/resources/queries-index.js'
import { validateSchema } from '@/utils/business.js'

import {
  listQuotas as listQuotasQuery,
  getAllQuotas,
} from '../queries-index.js'
import { UserProfile, adminGroupPath } from '@cpn-console/shared'

export const getQuotaAssociatedEnvironments = async (quotaId: string) => {
  try {
    const quota = await getQuotaById(quotaId)
    if (!quota) throw new NotFoundError('Quota introuvable')
    const environments = await getQuotaAssociatedEnvironmentById(quotaId)
    return environments.map(env => ({
      name: env.name,
      project: env.project.name,
      organization: env.project.organization.name,
      stage: env.stage.name,
      owner: env.project.roles?.[0].user.email,
    }))
  }
  catch (error) {
    throw new Error(error?.message)
  }
}

export const createQuota = async (data: CreateQuotaBody): Promise<QuotaDto> => {
  try {
    const schemaValidation = QuotaSchema.omit({ id: true }).safeParse(data)
    validateSchema(schemaValidation)

    const isNameTaken = await getQuotaByName(data.name)
    if (isNameTaken) throw new BadRequestError('Un quota portant ce nom existe déjà')

    const quota = await createQuotaQuery(data)

    if (data.stageIds?.length) {
      await linkQuotaToStages(quota.id, data.stageIds)
    }

    return {
      id: quota.id,
      name: quota.name,
      cpu: quota.cpu,
      memory: quota.memory,
      isPrivate: quota.isPrivate,
      stageIds: data.stageIds ?? [],
    }
  }
  catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const updateQuota = async (
  id: Quota['id'], {
    cpu,
    isPrivate,
    memory,
    name,
    stageIds,
  }: UpdateQuotaBody,
): Promise<QuotaDto> => {
  try {
    const dbQuota = await getQuotaById(id)

    if (!dbQuota) throw new NotFoundError('Quota introuvable')
    const dbStageIds = dbQuota.stages.map(({ id }) => id)
    if (name === dbQuota.name) {
      await updateQuotaName(id, name)
    }
    if (typeof isPrivate === 'boolean') {
      await updateQuotaPrivacyQuery(id, isPrivate)
    }
    if (cpu && memory) {
      await updateQuotaLimits(id, {
        cpu,
        memory,
      })
    }
    if (stageIds) {
      const dbStages = dbQuota.stages
      const stageIdsToRemove = dbStages
        .filter(({ id }) => !stageIds.includes(id))
        .map(({ id }) => id)

      if (stageIdsToRemove.length) {
        await unlinkQuotaFromStages(id, stageIdsToRemove)
      }
      if (stageIds?.length) {
        await linkQuotaToStages(id, stageIds)
      }
    }
    return {
      id,
      name: name ?? dbQuota.name,
      cpu: cpu ?? dbQuota.cpu,
      memory: memory ?? dbQuota.memory,
      isPrivate: isPrivate ?? dbQuota.isPrivate,
      stageIds: stageIds ?? dbStageIds,
    }
  }
  catch (error) {
    throw new Error(error?.message)
  }
}

export const deleteQuota = async (quotaId: string) => {
  try {
    const environments = await getQuotaAssociatedEnvironments(quotaId)
    if (environments.length) throw new BadRequestError('Impossible de supprimer le quota, des environnements en activité y ont souscrit', { extras: environments })

    await deleteQuotaQuery(quotaId)
  }
  catch (error) {
    if (error instanceof DsoError) {
      throw error
    }
    throw new Error(error?.message)
  }
}

export const listQuotas = async (kcUser: UserProfile) => {
  const quotas = kcUser.groups?.includes(adminGroupPath)
    ? await getAllQuotas()
    : await listQuotasQuery(kcUser.id)

  return quotas.map(({ stages, ...quota }) => {
    return {
      ...quota,
      stageIds: stages
        .map(({ id }) => id),
    }
  })
}
