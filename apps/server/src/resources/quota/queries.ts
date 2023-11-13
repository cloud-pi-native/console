import prisma from '@/prisma.js'
import { Quota, QuotaStage, Stage } from '@prisma/client'

export const getQuotas = async () => {
  return prisma.quota.findMany({
    where: {
      isPrivate: false,
    },
    include: {
      quotaStage: true,
    },
  })
}

export const getAllQuotas = async () => {
  return prisma.quota.findMany({
    include: {
      quotaStage: true,
    },
  })
}

export const getQuotaById = async (id: Quota['id']) => {
  return prisma.quota.findUnique({
    where: { id },
    include: {
      quotaStage: true,
    },
  })
}

export const getQuotaByName = async (name: Quota['name']) => {
  return prisma.quota.findUnique({
    where: { name },
  })
}

export const createQuota = async ({ memory, cpu, name, isPrivate = false }: { memory: Quota['memory'], cpu: Quota['cpu'], name: Quota['name'], isPrivate?: Quota['isPrivate'] }) => {
  return prisma.quota.create({
    data: {
      memory,
      cpu,
      name,
      isPrivate,
    },
  })
}

export const updateQuotaPrivacy = (quotaId: Quota['id'], isPrivate: Quota['isPrivate']) => prisma.quota.update({
  data: {
    isPrivate,
  },
  where: {
    id: quotaId,
  },
})

export const linkQuotaToStages = (quotaId: Quota['id'], stageIds: Stage['id'][]) => prisma.quotaStage.createMany({
  data: stageIds.map(stageId => ({ quotaId, stageId })),
  skipDuplicates: true,
})

export const linkStageToQuotas = (stageId: Stage['id'], quotaIds: Quota['id'][]) => prisma.quotaStage.createMany({
  data: quotaIds.map(quotaId => ({ stageId, quotaId })),
  skipDuplicates: true,
})

export const deleteQuota = async (quotaId: Quota['id']) => prisma.quota.delete({ where: { id: quotaId } })

export const deleteQuotaStage = async (quotaStageId: QuotaStage['id']) => prisma.quotaStage.delete({
  where: { id: quotaStageId },
})
