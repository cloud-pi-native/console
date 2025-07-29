import type { Cluster, Quota, Stage } from '@prisma/client'
import prisma from '@/prisma'

export function listStages() {
  return prisma.stage.findMany({
    include: {
      clusters: true,
      quotas: true,
    },
  })
}

export async function getAllStageIds() {
  return (await prisma.stage.findMany({
    select: {
      id: true,
    },
  })).map(({ id }) => id)
}

export function getStageById(id: Stage['id']) {
  return prisma.stage.findUnique({
    where: { id },
    include: {
      clusters: true,
      quotas: true,
    },
  })
}

export function getStageByIdOrThrow(id: Stage['id']) {
  return prisma.stage.findUniqueOrThrow({
    where: { id },
    include: {
      clusters: true,
      quotas: true,
    },
  })
}

export function getStageAssociatedEnvironmentById(id: Stage['id']) {
  return prisma.environment.findMany({
    where: {
      stageId: id,
    },
    select: {
      name: true,
      cluster: {
        select: {
          label: true,
        },
      },
      project: {
        select: {
          name: true,
          owner: true,
          slug: true,
        },
      },
      quota: true,
    },
  })
}

export function getStageAssociatedEnvironmentLengthById(id: Stage['id']) {
  return prisma.environment.count({
    where: {
      stageId: id,
    },
  })
}

export function getStageByName(name: Stage['name']) {
  return prisma.stage.findUnique({
    where: { name },
  })
}

export function linkStageToClusters(id: Stage['id'], clusterIds: Cluster['id'][]) {
  return prisma.stage.update({
    where: {
      id,
    },
    data: {
      clusters: {
        connect: clusterIds.map(clusterId => ({ id: clusterId })),
      },
    },
  })
}

export function createStage({ name }: { name: Stage['name'] }) {
  return prisma.stage.create({
    data: {
      name,
    },
  })
}

export function updateStageName(id: Stage['id'], name: Stage['name']) {
  return prisma.stage.update({
    where: {
      id,
    },
    data: {
      name,
    },
  })
}

export function linkStageToQuotas(stageId: Stage['id'], quotaIds: Quota['id'][]) {
  return Promise.all(quotaIds.map(quotaId => prisma.stage.update({
    where: {
      id: stageId,
    },
    data: {
      quotas: { connect: { id: quotaId } },
    },
  })))
}

export function unlinkStageFromQuotas(stageId: Stage['id'], quotaIds: Quota['id'][]) {
  return Promise.all(quotaIds.map(quotaId => prisma.stage.update({
    where: {
      id: stageId,
    },
    data: {
      quotas: { disconnect: { id: quotaId } },
    },
  })))
}

export function deleteStage(id: Stage['id']) {
  return prisma.stage.delete({
    where: { id },
  })
}
