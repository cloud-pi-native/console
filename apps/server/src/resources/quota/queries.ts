import type { Quota, QuotaStage, Stage } from '@prisma/client'
import prisma from '@/prisma.js'

export const getQuotas = () =>
  prisma.quota.findMany({
    where: {
      isPrivate: false,
    },
    include: {
      quotaStage: true,
    },
  })

export const getAllQuotas = () =>
  prisma.quota.findMany({
    include: {
      quotaStage: true,
    },
  })

export const getQuotaById = (id: Quota['id']) =>
  prisma.quota.findUniqueOrThrow({
    where: { id },
    include: { quotaStage: true },
  })

export const getQuotaByName = (name: Quota['name']) =>
  prisma.quota.findUnique({
    where: { name },
  })

// CREATE
type CreateQuotaParams = {
  memory: Quota['memory'],
  cpu: Quota['cpu'],
  name: Quota['name'],
  isPrivate?: Quota['isPrivate']
}

export const createQuota = ({ memory, cpu, name, isPrivate = false }: CreateQuotaParams) =>
  prisma.quota.create({
    data: {
      memory,
      cpu,
      name,
      isPrivate,
    },
  })

export const updateQuotaPrivacy = (quotaId: Quota['id'], isPrivate: Quota['isPrivate']) =>
  prisma.quota.update({
    data: {
      isPrivate,
    },
    where: {
      id: quotaId,
    },
  })

export const linkQuotaToStages = (quotaId: Quota['id'], stageIds: Stage['id'][]) =>
  prisma.quotaStage.createMany({
    data: stageIds.map(stageId => ({ quotaId, stageId })),
    skipDuplicates: true,
  })

export const linkStageToQuotas = (stageId: Stage['id'], quotaIds: Quota['id'][]) =>
  prisma.quotaStage.createMany({
    data: quotaIds.map(quotaId => ({ stageId, quotaId })),
    skipDuplicates: true,
  })

export const deleteQuota = (quotaId: Quota['id']) =>
  prisma.quota.delete({ where: { id: quotaId } })

export const deleteQuotaStage = (quotaStageId: QuotaStage['id']) =>
  prisma.quotaStage.delete({ where: { id: quotaStageId } })
