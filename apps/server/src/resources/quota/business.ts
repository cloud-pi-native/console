import type { Quota, User } from '@prisma/client'
import { type CreateQuotaBody, type Quota as QuotaDto, QuotaSchema, type UpdateQuotaBody } from '@cpn-console/shared'
import {
  getAllQuotas,
  listQuotas as listQuotasQuery,
} from '../queries-index.js'
import {
  createQuota as createQuotaQuery,
  deleteQuota as deleteQuotaQuery,
  getQuotaAssociatedEnvironmentById,
  getQuotaById,
  getQuotaByName,
  linkQuotaToStages,
  unlinkQuotaFromStages,
} from '@/resources/queries-index.js'
import { validateSchema } from '@/utils/business.js'

import { BadRequest400, ErrorResType, NotFound404 } from '@/utils/errors.js'
import prisma from '@/prisma.js'

export async function getQuotaAssociatedEnvironments(quotaId: string) {
  const environments = await getQuotaAssociatedEnvironmentById(quotaId)
  return environments.map(env => ({
    name: env.name,
    project: env.project.slug,
    stage: env.stage.name,
    owner: env.project.owner.email,
  }))
}

export async function createQuota(data: CreateQuotaBody): Promise<QuotaDto | ErrorResType> {
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

export async function updateQuota(id: Quota['id'], {
  cpu,
  isPrivate,
  memory,
  name,
  stageIds,
}: UpdateQuotaBody) {
  const dbQuota = await getQuotaById(id)

  if (!dbQuota) return new NotFound404()
  const dbStageIds = dbQuota.stages.map(({ id }) => id)
  if (name || isPrivate || cpu || memory) {
    await prisma.quota.update({
      where: { id },
      data: {
        cpu,
        isPrivate,
        memory,
        name,
      },
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

export async function deleteQuota(quotaId: string) {
  const attachedEnvironment = await prisma.environment.findFirst({ where: { quotaId }, select: { id: true } })
  if (attachedEnvironment) return new BadRequest400('Impossible de supprimer le quota, des environnements en activité y ont souscrit')

  await deleteQuotaQuery(quotaId)
  return null
}

export async function listQuotas(userId?: User['id']) {
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
