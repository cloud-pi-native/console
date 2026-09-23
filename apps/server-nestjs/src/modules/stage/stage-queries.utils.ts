import type { Cluster, Prisma, Stage } from '@prisma/client'

export const stageSelect = {
  id: true,
  name: true,
} satisfies Prisma.StageSelect
export type StageRecord = Prisma.StageGetPayload<{ select: typeof stageSelect }>

export const stageWithClustersSelect = {
  id: true,
  name: true,
  clusters: { select: { id: true } },
} satisfies Prisma.StageSelect
export type StageWithClustersRecord = Prisma.StageGetPayload<{ select: typeof stageWithClustersSelect }>

export const stageEnvironmentsSelect = {
  id: true,
  name: true,
  projectId: true,
  memory: true,
  cpu: true,
  gpu: true,
  autosync: true,
  clusterId: true,
  stageId: true,
  createdAt: true,
  updatedAt: true,
  cluster: { select: { label: true } },
  project: {
    select: {
      name: true,
      owner: true,
      slug: true,
    },
  },
} satisfies Prisma.EnvironmentSelect
export type StageEnvironmentsRecord = Prisma.EnvironmentGetPayload<{ select: typeof stageEnvironmentsSelect }>

export function listStages(tx: Prisma.TransactionClient) {
  return tx.stage.findMany({
    select: stageWithClustersSelect,
  })
}

export function getAllStageIds(tx: Prisma.TransactionClient) {
  return tx.stage.findMany({
    select: { id: true },
  })
}

export function getStageById(tx: Prisma.TransactionClient, id: Stage['id']) {
  return tx.stage.findUnique({
    where: { id },
    select: stageWithClustersSelect,
  })
}

export function getStageByName(tx: Prisma.TransactionClient, name: Stage['name']) {
  return tx.stage.findUnique({ where: { name } })
}

export function getStageAssociatedEnvironments(tx: Prisma.TransactionClient, id: Stage['id']) {
  return tx.environment.findMany({
    where: { stageId: id },
    select: stageEnvironmentsSelect,
  })
}

export function getStageAssociatedEnvironmentCount(tx: Prisma.TransactionClient, id: Stage['id']) {
  return tx.environment.count({
    where: { stageId: id },
  })
}

export function createStage(tx: Prisma.TransactionClient, { name }: { name: Stage['name'] }) {
  return tx.stage.create({
    data: { name },
    select: stageSelect,
  })
}

export function updateStageName(tx: Prisma.TransactionClient, id: Stage['id'], name: Stage['name']) {
  return tx.stage.update({
    where: { id },
    data: { name },
  })
}

export function linkStageToClusters(tx: Prisma.TransactionClient, id: Stage['id'], clusterIds: Cluster['id'][]) {
  return tx.stage.update({
    where: { id },
    data: {
      clusters: {
        connect: clusterIds.map(clusterId => ({ id: clusterId })),
      },
    },
  })
}

export function disconnectClusterFromStage(tx: Prisma.TransactionClient, clusterId: Cluster['id'], stageId: Stage['id']) {
  return tx.stage.update({
    where: { id: stageId },
    data: {
      clusters: {
        disconnect: { id: clusterId },
      },
    },
  })
}

export function deleteStage(tx: Prisma.TransactionClient, id: Stage['id']) {
  return tx.stage.delete({ where: { id } })
}

export function linkClusterToStages(tx: Prisma.TransactionClient, clusterId: Cluster['id'], stageIds: Stage['id'][]) {
  return tx.cluster.update({
    where: { id: clusterId },
    data: {
      stages: {
        connect: stageIds.map(stageId => ({ id: stageId })),
      },
    },
  })
}

export function removeClusterFromStage(tx: Prisma.TransactionClient, clusterId: Cluster['id'], stageId: Stage['id']) {
  return tx.cluster.update({
    where: { id: clusterId },
    data: {
      stages: {
        disconnect: { id: stageId },
      },
    },
  })
}
