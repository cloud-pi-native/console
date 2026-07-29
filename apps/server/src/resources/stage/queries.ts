import type { Cluster, Stage } from '@prisma/client'
import prisma from '@/prisma.js'

export async function listStages() {
  return prisma.stage.findMany({
    include: {
      clusters: true,
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

export async function getStageById(id: Stage['id']) {
  return prisma.stage.findUnique({
    where: { id },
    include: {
      clusters: true,
    },
  })
}

export async function getStageByIdOrThrow(id: Stage['id']) {
  return prisma.stage.findUniqueOrThrow({
    where: { id },
    include: {
      clusters: true,
    },
  })
}

export async function getStageAssociatedEnvironmentById(id: Stage['id']) {
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
    },
  })
}

export async function getStageAssociatedEnvironmentLengthById(id: Stage['id']) {
  return prisma.environment.count({
    where: {
      stageId: id,
    },
  })
}

export async function getStageByName(name: Stage['name']) {
  return prisma.stage.findUnique({
    where: { name },
  })
}

export async function linkStageToClusters(id: Stage['id'], clusterIds: Cluster['id'][]) {
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

export async function createStage({ name }: { name: Stage['name'] }) {
  return prisma.stage.create({
    data: {
      name,
    },
  })
}

export async function updateStageName(id: Stage['id'], name: Stage['name']) {
  return prisma.stage.update({
    where: {
      id,
    },
    data: {
      name,
    },
  })
}

export async function deleteStage(id: Stage['id']) {
  return prisma.stage.delete({
    where: { id },
  })
}
