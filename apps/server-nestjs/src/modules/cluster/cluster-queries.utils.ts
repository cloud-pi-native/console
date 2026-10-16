import type { Kubeconfig } from '@cpn-console/shared'
import type { Cluster, Prisma } from '@prisma/client'
import { ClusterPrivacySchema } from '@cpn-console/shared'

const CLUSTER_PUBLIC = ClusterPrivacySchema.enum.public
const CLUSTER_DEDICATED = ClusterPrivacySchema.enum.dedicated

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

export function getClusterById(tx: Prisma.TransactionClient, id: string) {
  return tx.cluster.findUnique({
    where: { id },
    include: { kubeconfig: true },
  })
}

export function listClusterEnvironments(tx: Prisma.TransactionClient, clusterId: string) {
  return tx.environment.findMany({
    where: { clusterId },
    select: clusterEnvironmentsSelect,
  })
}

export function getClusterDetails(tx: Prisma.TransactionClient, id: string) {
  return tx.cluster.findUniqueOrThrow({
    where: { id },
    select: clusterDetailsSelect,
  })
}

export function getClusterByLabel(tx: Prisma.TransactionClient, label: string) {
  return tx.cluster.findUnique({ where: { label } })
}

export function listClusters(tx: Prisma.TransactionClient, where: Prisma.ClusterWhereInput) {
  return tx.cluster.findMany({
    where,
    select: clusterListSelect,
  })
}

export function generateClusterWhere(userId?: string): Prisma.ClusterWhereInput {
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

export function getProjectsByClusterId(tx: Prisma.TransactionClient, id: string) {
  return tx.cluster.findUniqueOrThrow({
    where: { id },
    select: { projects: true },
  }).then(cluster => cluster.projects)
}

export function getStagesByClusterId(tx: Prisma.TransactionClient, id: string) {
  return tx.cluster.findUniqueOrThrow({
    where: { id },
    select: { stages: true },
  }).then(cluster => cluster.stages)
}

export function createCluster(
  tx: Prisma.TransactionClient,
  data: Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId' | 'secretName' | 'zoneId'>,
  kubeconfig: Pick<Kubeconfig, 'user' | 'cluster'>,
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
  tx: Prisma.TransactionClient,
  id: string,
  data: Partial<Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId' | 'zoneId'>>,
  kubeconfig?: Pick<Kubeconfig, 'user' | 'cluster'>,
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

export function linkClusterToProjects(tx: Prisma.TransactionClient, id: string, projectIds: string[]) {
  return tx.cluster.update({
    where: { id },
    data: {
      projects: { connect: projectIds.map(projectId => ({ id: projectId })) },
    },
  })
}

export function linkClusterToStages(tx: Prisma.TransactionClient, id: string, stageIds: string[]) {
  return tx.cluster.update({
    where: { id },
    data: {
      stages: { connect: stageIds.map(stageId => ({ id: stageId })) },
    },
  })
}

export function removeClusterFromProject(tx: Prisma.TransactionClient, id: string, projectId: string) {
  return tx.cluster.update({
    where: { id },
    data: {
      projects: { disconnect: { id: projectId } },
    },
  })
}

export function removeClusterFromStage(tx: Prisma.TransactionClient, id: string, stageId: string) {
  return tx.cluster.update({
    where: { id },
    data: {
      stages: { disconnect: { id: stageId } },
    },
  })
}

export async function syncClusterStageLinks(
  tx: Prisma.TransactionClient,
  clusterUpdated: Awaited<ReturnType<typeof updateCluster>>,
  clusterId: string,
  stageIds: string[] | undefined,
) {
  if (!stageIds) return

  await linkClusterToStages(tx, clusterId, stageIds)

  const dbStages = await getStagesByClusterId(tx, clusterId)
  for (const stage of dbStages ?? []) {
    if (!stageIds.includes(stage.id)) {
      await removeClusterFromStage(tx, clusterUpdated.id, stage.id)
    }
  }
}

export async function syncClusterProjectLinks(
  tx: Prisma.TransactionClient,
  clusterUpdated: Awaited<ReturnType<typeof updateCluster>>,
  clusterId: string,
  projectIds: string[] | undefined,
) {
  if (projectIds && clusterUpdated.privacy === CLUSTER_DEDICATED) {
    await linkClusterToProjects(tx, clusterId, projectIds)
  }

  if (clusterUpdated.privacy === CLUSTER_PUBLIC) {
    const dbProjects = await getProjectsByClusterId(tx, clusterId)
    for (const projectId of dbProjects?.map(project => project.id) ?? []) {
      await removeClusterFromProject(tx, clusterUpdated.id, projectId)
    }
    return
  }

  const dbProjects = await getProjectsByClusterId(tx, clusterId)
  const dbProjectIds = dbProjects?.map(project => project.id) ?? []
  for (const projectId of dbProjectIds.filter(dbProjectId => !projectIds?.includes(dbProjectId))) {
    await removeClusterFromProject(tx, clusterUpdated.id, projectId)
  }
}

export function deleteCluster(tx: Prisma.TransactionClient, id: string) {
  return tx.cluster.delete({ where: { id } })
}

export function linkZoneToClusters(tx: Prisma.TransactionClient, zoneId: string, clusterIds: string[]) {
  return tx.zone.update({
    where: { id: zoneId },
    data: {
      clusters: { connect: clusterIds.map(clusterId => ({ id: clusterId })) },
    },
  })
}

export async function getClusterUsage(tx: Prisma.TransactionClient, clusterId: string) {
  const clusterUsage = await tx.environment.aggregate({
    _sum: { memory: true, cpu: true, gpu: true },
    where: { clusterId },
  })
  return {
    cpu: clusterUsage._sum.cpu ?? 0,
    gpu: clusterUsage._sum.gpu ?? 0,
    memory: clusterUsage._sum.memory ?? 0,
  }
}
