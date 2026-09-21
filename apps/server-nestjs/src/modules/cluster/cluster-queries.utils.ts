import type { Kubeconfig as KubeconfigBody } from '@cpn-console/shared'
import type { Cluster, Prisma as PrismaClient } from '@prisma/client'
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
} satisfies PrismaClient.ClusterSelect
export type ClusterListRecord = PrismaClient.ClusterGetPayload<{ select: typeof clusterListSelect }>

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
} satisfies PrismaClient.ClusterSelect
export type ClusterDetailsRecord = PrismaClient.ClusterGetPayload<{ select: typeof clusterDetailsSelect }>

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
} satisfies PrismaClient.EnvironmentSelect
export type ClusterEnvironmentsRecord = PrismaClient.EnvironmentGetPayload<{ select: typeof clusterEnvironmentsSelect }>

export function generateClusterWhereInput(userId?: string): PrismaClient.ClusterWhereInput {
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

export async function getProjectsByClusterId(tx: PrismaClient.TransactionClient, id: string) {
  return (await tx.cluster.findUniqueOrThrow({
    where: { id },
    select: { projects: true },
  }))?.projects
}

export async function listStagesByClusterId(tx: PrismaClient.TransactionClient, id: string) {
  return (await tx.cluster.findUniqueOrThrow({
    where: { id },
    select: { stages: true },
  }))?.stages
}

export function createCluster(
  tx: PrismaClient.TransactionClient,
  data: Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId' | 'secretName' | 'zoneId'>,
  kubeconfig: Pick<KubeconfigBody, 'user' | 'cluster'>,
  zoneId: string,
) {
  return tx.cluster.create({
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
  tx: PrismaClient.TransactionClient,
  id: string,
  data: Partial<Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId' | 'zoneId'>>,
  kubeconfig?: Pick<KubeconfigBody, 'user' | 'cluster'>,
) {
  return tx.cluster.update({
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

export function linkClusterToProjects(tx: PrismaClient.TransactionClient, id: string, projectIds: string[]) {
  return tx.cluster.update({
    where: { id },
    data: {
      projects: { connect: projectIds.map(projectId => ({ id: projectId })) },
    },
  })
}

export function linkClusterToStages(tx: PrismaClient.TransactionClient, id: string, stageIds: string[]) {
  return tx.cluster.update({
    where: { id },
    data: {
      stages: { connect: stageIds.map(stageId => ({ id: stageId })) },
    },
  })
}

export function removeClusterFromProject(tx: PrismaClient.TransactionClient, id: string, projectId: string) {
  return tx.cluster.update({
    where: { id },
    data: {
      projects: { disconnect: { id: projectId } },
    },
  })
}

export function removeClusterFromStage(tx: PrismaClient.TransactionClient, id: string, stageId: string) {
  return tx.cluster.update({
    where: { id },
    data: {
      stages: { disconnect: { id: stageId } },
    },
  })
}

export function deleteCluster(tx: PrismaClient.TransactionClient, id: string) {
  return tx.cluster.delete({ where: { id } })
}

export function linkZoneToClusters(tx: PrismaClient.TransactionClient, zoneId: string, clusterIds: string[]) {
  return tx.zone.update({
    where: { id: zoneId },
    data: {
      clusters: { connect: clusterIds.map(clusterId => ({ id: clusterId })) },
    },
  })
}
