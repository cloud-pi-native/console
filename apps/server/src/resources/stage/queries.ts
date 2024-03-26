import type { Cluster, QuotaStage, Stage } from '@prisma/client'
import prisma from '@/prisma.js'

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

export const getStageByName = async (name: Stage['name']) => {
  return prisma.stage.findUnique({
    where: { name },
  })
}

export const getQuotaStageById = async (id: QuotaStage['id']) => {
  return prisma.quotaStage.findUnique({
    where: { id },
  })
}

export const linkStageToClusters = async (id: Stage['id'], clusterIds: Cluster['id'][]) => prisma.stage.update({
  where: {
    id,
  },
  data: {
    clusters: {
      connect: clusterIds.map(clusterId => ({ id: clusterId })),
    },
  },
})

export const createStage = async ({ name }: { name: Stage['name'] }) => {
  return prisma.stage.create({
    data: {
      name,
    },
  })
}

export const deleteStage = async (id: Stage['id']) => {
  return prisma.stage.delete({
    where: { id },
  })
}
