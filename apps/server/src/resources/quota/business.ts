import { User, type Quota } from '@prisma/client'
import { type CreateQuotaBody, QuotaSchema, type UpdateQuotaBody, type Quota as QuotaDto } from '@cpn-console/shared'
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
import { ErrorResType, BadRequest400, NotFound404 } from '@/utils/errors.js'
import prisma from '@/prisma.js'

export const getQuotaAssociatedEnvironments = async (quotaId: string) => {
  try {
    const quota = await getQuotaById(quotaId)
    if (!quota) return new NotFound404()
    const environments = await getQuotaAssociatedEnvironmentById(quotaId)
    return environments.map(env => ({
      name: env.name,
      project: env.project.name,
      organization: env.project.organization.name,
      stage: env.stage.name,
      owner: env.project.owner.email,
    }))
  } catch (error) {
    throw new Error(error?.message)
  }
}

export const createQuota = async (data: CreateQuotaBody): Promise<QuotaDto | ErrorResType> => {
  const schemaValidation = QuotaSchema.omit({ id: true }).safeParse(data)
  const validateResult = validateSchema(schemaValidation)
  if (validateResult instanceof ErrorResType) return validateResult

  const isNameTaken = await getQuotaByName(data.name)
  if (isNameTaken) return new BadRequest400('Un quota portant ce nom existe déjà')

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

export const updateQuota = async (
  id: Quota['id'], {
    cpu,
    isPrivate,
    memory,
    name,
    stageIds,
  }: UpdateQuotaBody,
) => {
  const dbQuota = await getQuotaById(id)

  if (!dbQuota) return new NotFound404()
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

export const deleteQuota = async (quotaId: string) => {
  const attachedEnvironment = await prisma.environment.findFirst({ where: { quotaId }, select: { id: true } })
  if (attachedEnvironment) return new BadRequest400('Impossible de supprimer le quota, des environnements en activité y ont souscrit')

  await deleteQuotaQuery(quotaId)
  return null
}

export const listQuotas = async (userId?: User['id']) => {
  const quotas = userId
    ? await listQuotasQuery(userId)
    : await getAllQuotas()

  return quotas.map(({ stages, ...quota }) => {
    return {
      ...quota,
      stageIds: stages
        .map(({ id }) => id),
    }
  })
}
