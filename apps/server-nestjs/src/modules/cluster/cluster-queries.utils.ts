import type { Kubeconfig as KubeconfigBody } from '@cpn-console/shared'
import type { Cluster, Prisma } from '@prisma/client'
import { ClusterPrivacySchema } from '@cpn-console/shared'

const CLUSTER_PUBLIC = ClusterPrivacySchema.enum.public

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

export function getClusterById(prisma: Prisma.TransactionClient, id: string) {
  return prisma.cluster.findUnique({
    where: { id },
    include: { kubeconfig: true },
  })
}

export function getClusterEnvironments(prisma: Prisma.TransactionClient, clusterId: string) {
  return prisma.environment.findMany({
    where: { clusterId },
    select: clusterEnvironmentsSelect,
  })
}

export function getClusterDetails(prisma: Prisma.TransactionClient, id: string) {
  return prisma.cluster.findUniqueOrThrow({
    where: { id },
    select: clusterDetailsSelect,
  })
}

export function getClusterByLabel(prisma: Prisma.TransactionClient, label: string) {
  return prisma.cluster.findUnique({ where: { label } })
}

export function listClusters(prisma: Prisma.TransactionClient, where: Prisma.ClusterWhereInput) {
  return prisma.cluster.findMany({
    where,
    select: clusterListSelect,
  })
}

export function listClustersWhere(userId?: string): Prisma.ClusterWhereInput {
  return userId
    ? {
        OR: [
          { privacy: CLUSTER_PUBLIC },
          { projects: { some: { members: { some: { userId } } } } },
          { projects: { some: { ownerId: userId } } },
          { environments: { some: { project: { members: { some: { userId } } } } } },
        ],
      }
    : {}
}

export async function getProjectsByClusterId(prisma: Prisma.TransactionClient, id: string) {
  return (await prisma.cluster.findUniqueOrThrow({
    where: { id },
    select: { projects: true },
  }))?.projects
}

export async function listStagesByClusterId(prisma: Prisma.TransactionClient, id: string) {
  return (await prisma.cluster.findUniqueOrThrow({
    where: { id },
    select: { stages: true },
  }))?.stages
}

export function createCluster(
  prisma: Prisma.TransactionClient,
  data: Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId' | 'secretName' | 'zoneId'>,
  kubeconfig: Pick<KubeconfigBody, 'user' | 'cluster'>,
  zoneId: string,
) {
  return prisma.cluster.create({
    data: {
      ...data,
      kubeconfig: {
        create: {
          user: kubeconfig.user,
          cluster: kubeconfig.cluster,
        },
      },
      zone: { connect: { id: zoneId } },
    },
  })
}

export function updateCluster(
  prisma: Prisma.TransactionClient,
  id: string,
  data: Partial<Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId' | 'zoneId'>>,
  kubeconfig?: Pick<KubeconfigBody, 'user' | 'cluster'>,
) {
  return prisma.cluster.update({
    where: { id },
    data: kubeconfig
      ? {
          ...data,
          kubeconfig: {
            update: {
              user: kubeconfig.user,
              cluster: kubeconfig.cluster,
            },
          },
        }
      : data,
  })
}

export function linkClusterToProjects(prisma: Prisma.TransactionClient, id: string, projectIds: string[]) {
  return prisma.cluster.update({
    where: { id },
    data: {
      projects: { connect: projectIds.map(projectId => ({ id: projectId })) },
    },
  })
}

export function linkClusterToStages(prisma: Prisma.TransactionClient, id: string, stageIds: string[]) {
  return prisma.cluster.update({
    where: { id },
    data: {
      stages: { connect: stageIds.map(stageId => ({ id: stageId })) },
    },
  })
}

export function removeClusterFromProject(prisma: Prisma.TransactionClient, id: string, projectId: string) {
  return prisma.cluster.update({
    where: { id },
    data: {
      projects: { disconnect: { id: projectId } },
    },
  })
}

export function removeClusterFromStage(prisma: Prisma.TransactionClient, id: string, stageId: string) {
  return prisma.cluster.update({
    where: { id },
    data: {
      stages: { disconnect: { id: stageId } },
    },
  })
}

export function deleteCluster(prisma: Prisma.TransactionClient, id: string) {
  return prisma.cluster.delete({ where: { id } })
}

export function linkZoneToClusters(prisma: Prisma.TransactionClient, zoneId: string, clusterIds: string[]) {
  return prisma.zone.update({
    where: { id: zoneId },
    data: {
      clusters: { connect: clusterIds.map(clusterId => ({ id: clusterId })) },
    },
  })
}

export async function getClusterUsage(prisma: Prisma.TransactionClient, clusterId: string) {
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
