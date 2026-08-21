import type { Cluster, Environment, Kubeconfig, Prisma, Project, Stage, Zone } from '@prisma/client'
import { PrismaService } from '../infrastructure/database/prisma.service'

// ── selects ───────────────────────────────────────────────────────────────────────────
export const clusterListSelect = {
  id: true,
  label: true,
  privacy: true,
  secretName: true,
  clusterResources: true,
  kubeConfigId: true,
  infos: true,
  zoneId: true,
  cpu: true,
  gpu: true,
  memory: true,
  createdAt: true,
  updatedAt: true,
  stages: true,
} satisfies Prisma.ClusterSelect
export type ClusterListRecord = Prisma.ClusterGetPayload<{ select: typeof clusterListSelect }>

export const clusterDetailsSelect = {
  id: true,
  label: true,
  privacy: true,
  secretName: true,
  clusterResources: true,
  kubeConfigId: true,
  infos: true,
  zoneId: true,
  cpu: true,
  gpu: true,
  memory: true,
  createdAt: true,
  updatedAt: true,
  projects: { select: { id: true } },
  kubeconfig: true,
  stages: true,
} satisfies Prisma.ClusterSelect
export type ClusterDetailsRecord = Prisma.ClusterGetPayload<{ select: typeof clusterDetailsSelect }>

export const clusterEnvironmentsSelect = {
  id: true,
  name: true,
  cpu: true,
  gpu: true,
  memory: true,
  projectId: true,
  autosync: true,
  clusterId: true,
  stageId: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      slug: true,
      name: true,
      owner: true,
      members: true,
    },
  },
} satisfies Prisma.EnvironmentSelect
export type ClusterEnvironmentsRecord = Prisma.EnvironmentGetPayload<{ select: typeof clusterEnvironmentsSelect }>

// ── query: getClusterById ───────────────────────────────────────────────────────────
export function getClusterById(prisma: PrismaService, id: Cluster['id']) {
  return prisma.cluster.findUnique({
    where: { id },
    include: { kubeconfig: true },
  })
}

// ── query: getClusterByIdOrThrow ────────────────────────────────────────────────────
export function getClusterByIdOrThrow(prisma: PrismaService, id: Cluster['id']) {
  return prisma.cluster.findUniqueOrThrow({
    where: { id },
    include: { kubeconfig: true, zone: true },
  })
}

// ── query: getClusterEnvironments ────────────────────────────────────────────────────
export function getClusterEnvironments(prisma: PrismaService, clusterId: Cluster['id']) {
  return prisma.environment.findMany({
    where: { clusterId },
    select: clusterEnvironmentsSelect,
  })
}

// ── query: getClusterDetails ─────────────────────────────────────────────────────────
export function getClusterDetails(prisma: PrismaService, id: Cluster['id']) {
  return prisma.cluster.findUniqueOrThrow({
    where: { id },
    select: clusterDetailsSelect,
  })
}

// ── query: getClustersByIds ──────────────────────────────────────────────────────────
export function getClustersByIds(prisma: PrismaService, clusterIds: Cluster['id'][]) {
  return prisma.cluster.findMany({
    where: { id: { in: clusterIds } },
    include: { kubeconfig: true },
  })
}

// ── query: getPublicClusters ─────────────────────────────────────────────────────────
export function getPublicClusters(prisma: PrismaService) {
  return prisma.cluster.findMany({
    where: { privacy: 'public' },
    include: { zone: true },
  })
}

// ── query: getClusterNamesByZoneId ────────────────────────────────────────────────────
export async function getClusterNamesByZoneId(prisma: PrismaService, zoneId: string) {
  const clusterNames = await prisma.cluster.findMany({
    where: { zoneId },
    select: { label: true },
  })
  return clusterNames.map(({ label }) => label)
}

// ── query: getClusterByLabel ──────────────────────────────────────────────────────────
export function getClusterByLabel(prisma: PrismaService, label: Cluster['label']) {
  return prisma.cluster.findUnique({ where: { label } })
}

// ── query: getClusterByEnvironmentId ──────────────────────────────────────────────────
export function getClusterByEnvironmentId(prisma: PrismaService, id: Environment['id']) {
  return prisma.cluster.findMany({
    where: { environments: { some: { id } } },
    include: { kubeconfig: true },
  })
}

// ── query: getClustersWithProjectIdAndConfig ──────────────────────────────────────────
export function getClustersWithProjectIdAndConfig(prisma: PrismaService) {
  return prisma.cluster.findMany({
    select: {
      id: true,
      stages: true,
      projects: {
        where: { status: { not: 'archived' } },
        select: { id: true, name: true, slug: true, status: true },
      },
      clusterResources: true,
      label: true,
      infos: true,
      privacy: true,
      secretName: true,
      kubeconfig: true,
      zoneId: true,
      cpu: true,
      gpu: true,
      memory: true,
    },
  })
}

// ── query: listClusters ──────────────────────────────────────────────────────────────
export function listClusters(prisma: PrismaService, where: Prisma.ClusterWhereInput) {
  return prisma.cluster.findMany({
    where,
    select: clusterListSelect,
  })
}

// ── query: getProjectsByClusterId ─────────────────────────────────────────────────────
export async function getProjectsByClusterId(prisma: PrismaService, id: Cluster['id']) {
  return (await prisma.cluster.findUniqueOrThrow({
    where: { id },
    select: { projects: true },
  }))?.projects
}

// ── query: listStagesByClusterId ──────────────────────────────────────────────────────
export async function listStagesByClusterId(prisma: PrismaService, id: Cluster['id']) {
  return (await prisma.cluster.findUniqueOrThrow({
    where: { id },
    select: { stages: true },
  }))?.stages
}

// ── query: createCluster ─────────────────────────────────────────────────────────────
export function createCluster(
  prisma: PrismaService,
  data: Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId' | 'secretName' | 'zoneId'>,
  kubeconfig: Pick<Kubeconfig, 'user' | 'cluster'>,
  zoneId: string,
) {
  return prisma.cluster.create({
    data: {
      ...data,
      // @ts-ignore
      kubeconfig: { create: kubeconfig },
      zone: { connect: { id: zoneId } },
    },
  })
}

// ── query: updateCluster ─────────────────────────────────────────────────────────────
export function updateCluster(
  prisma: PrismaService,
  id: Cluster['id'],
  data: Partial<Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId'>>,
  kubeconfig: Pick<Kubeconfig, 'user' | 'cluster'>,
) {
  return prisma.cluster.update({
    where: { id },
    data: {
      ...data,
      kubeconfig: {
        // @ts-ignore
        update: kubeconfig,
      },
    },
  })
}

// ── query: linkClusterToProjects ──────────────────────────────────────────────────────
export function linkClusterToProjects(prisma: PrismaService, id: Cluster['id'], projectIds: Project['id'][]) {
  return prisma.cluster.update({
    where: { id },
    data: {
      projects: { connect: projectIds.map(projectId => ({ id: projectId })) },
    },
  })
}

// ── query: linkClusterToStages ────────────────────────────────────────────────────────
export function linkClusterToStages(prisma: PrismaService, id: Cluster['id'], stageIds: Stage['id'][]) {
  return prisma.cluster.update({
    where: { id },
    data: {
      stages: { connect: stageIds.map(stageId => ({ id: stageId })) },
    },
  })
}

// ── query: removeClusterFromProject ───────────────────────────────────────────────────
export function removeClusterFromProject(prisma: PrismaService, id: Cluster['id'], projectId: Project['id']) {
  return prisma.cluster.update({
    where: { id },
    data: {
      projects: { disconnect: { id: projectId } },
    },
  })
}

// ── query: removeClusterFromStage ─────────────────────────────────────────────────────
export function removeClusterFromStage(prisma: PrismaService, id: Cluster['id'], stageId: Stage['id']) {
  return prisma.cluster.update({
    where: { id },
    data: {
      stages: { disconnect: { id: stageId } },
    },
  })
}

// ── query: deleteCluster ─────────────────────────────────────────────────────────────
export function deleteCluster(prisma: PrismaService, id: Cluster['id']) {
  return prisma.cluster.delete({ where: { id } })
}

// ── query: linkZoneToClusters ────────────────────────────────────────────────────────
export function linkZoneToClusters(prisma: PrismaService, zoneId: Zone['id'], clusterIds: Cluster['id'][]) {
  return prisma.zone.update({
    where: { id: zoneId },
    data: {
      clusters: { connect: clusterIds.map(clusterId => ({ id: clusterId })) },
    },
  })
}

// ── query: getClusterUsage ───────────────────────────────────────────────────────────
export async function getClusterUsage(prisma: PrismaService, clusterId: Cluster['id']) {
  const clusterUsage = await prisma.environment.aggregate({
    _sum: { memory: true, cpu: true, gpu: true },
    where: { clusterId },
  })
  return {
    cpu: clusterUsage._sum.cpu ?? 0,
    gpu: clusterUsage._sum.gpu ?? 0,
    memory: clusterUsage._sum.memory ?? 0,
  }
}
