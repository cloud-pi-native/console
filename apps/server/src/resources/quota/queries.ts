import prisma from '@/prisma.js'
import { Quota } from '@prisma/client'

export const getQuotas = async () => {
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
