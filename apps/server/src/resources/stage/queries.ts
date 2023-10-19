import prisma from '@/prisma.js'
import { Cluster, QuotaStage, Stage } from '@prisma/client'

export const getStages = async () => {
  return prisma.stage.findMany({
    include: {
      clusters: true,
      quotaStage: true,
    },
  })
}

export const getAllStageIds = async () => {
  return (await prisma.stage.findMany({
    select: {
      id: true,
    },
  })).map(({ id }) => id)
}

export const getStageById = async (id: Stage['id']) => {
  return prisma.stage.findUnique({
    where: { id },
    include: {
      clusters: true,
      quotaStage: true,
    },
  })
}

export const getQuotaStageById = async (id: QuotaStage['id']) => {
  return prisma.quotaStage.findUnique({
    where: { id },
  })
}

export const linkClusterToStages = async (clusterId: Cluster['id'], stageIds: Stage['id'][]) => {
  return prisma.cluster.update({
    where: {
      id: clusterId,
    },
    data: {
      stages: {
        connect: stageIds.map(stageId => ({ id: stageId })),
      },
    },
  })
}
