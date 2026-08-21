import type { Cluster, Prisma, Stage } from '@prisma/client'
import { PrismaService } from '../infrastructure/database/prisma.service'

// ── selects ───────────────────────────────────────────────────────────────────────────
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

// ── queries ───────────────────────────────────────────────────────────────────────────
export function listStages(prisma: PrismaService) {
  return prisma.stage.findMany({
    select: stageWithClustersSelect,
  })
}

export function getAllStageIds(prisma: PrismaService) {
  return prisma.stage.findMany({
    select: { id: true },
  })
}

export function getStageById(prisma: PrismaService, id: Stage['id']) {
  return prisma.stage.findUnique({
    where: { id },
    select: stageWithClustersSelect,
  })
}

export function getStageByName(prisma: PrismaService, name: Stage['name']) {
  return prisma.stage.findUnique({ where: { name } })
}

export function getStageAssociatedEnvironments(prisma: PrismaService, id: Stage['id']) {
  return prisma.environment.findMany({
    where: { stageId: id },
    select: stageEnvironmentsSelect,
  })
}

export function getStageAssociatedEnvironmentCount(prisma: PrismaService, id: Stage['id']) {
  return prisma.environment.count({
    where: { stageId: id },
  })
}

export function createStage(prisma: PrismaService, { name }: { name: Stage['name'] }) {
  return prisma.stage.create({
    data: { name },
    select: stageSelect,
  })
}

export function updateStageName(prisma: PrismaService, id: Stage['id'], name: Stage['name']) {
  return prisma.stage.update({
    where: { id },
    data: { name },
  })
}

export function linkStageToClusters(prisma: PrismaService, id: Stage['id'], clusterIds: Cluster['id'][]) {
  return prisma.stage.update({
    where: { id },
    data: {
      clusters: {
        connect: clusterIds.map(clusterId => ({ id: clusterId })),
      },
    },
  })
}

export function disconnectClusterFromStage(prisma: PrismaService, clusterId: Cluster['id'], stageId: Stage['id']) {
  return prisma.stage.update({
    where: { id: stageId },
    data: {
      clusters: {
        disconnect: { id: clusterId },
      },
    },
  })
}

export function deleteStage(prisma: PrismaService, id: Stage['id']) {
  return prisma.stage.delete({ where: { id } })
}

export function linkClusterToStages(prisma: PrismaService, clusterId: Cluster['id'], stageIds: Stage['id'][]) {
  return prisma.cluster.update({
    where: { id: clusterId },
    data: {
      stages: {
        connect: stageIds.map(stageId => ({ id: stageId })),
      },
    },
  })
}

export function removeClusterFromStage(prisma: PrismaService, clusterId: Cluster['id'], stageId: Stage['id']) {
  return prisma.cluster.update({
    where: { id: clusterId },
    data: {
      stages: {
        disconnect: { id: stageId },
      },
    },
  })
}
