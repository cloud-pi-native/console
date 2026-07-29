import type { Cluster, Environment, Kubeconfig, Prisma, Project, Stage } from '@prisma/client'
import prisma from '@/prisma.js'

export async function getClustersAssociatedWithProject(projectId: Project['id']) {
  const [
    clusterIdsHistory,
    clusterIdsEnv,
  ] = await Promise.all([
    prisma.projectClusterHistory.findMany({
      select: {
        clusterId: true,
      },
      where: {
        projectId,
      },
    }).then(history => history.map(({ clusterId }) => clusterId)),
    prisma.cluster.findMany({
      where: { environments: { some: { project: { id: projectId } } } },
      select: { id: true },
    }).then(cluster => cluster.map(({ id }) => id)),
  ])
  const clusterIds = [
    ...clusterIdsHistory,
    ...clusterIdsEnv.filter(id => !clusterIdsHistory.includes(id)),
  ]
  return prisma.cluster.findMany({
    where: { id: { in: clusterIds } },
    select: {
      id: true,
      infos: true,
      label: true,
      privacy: true,
      secretName: true,
      kubeconfig: true,
      clusterResources: true,
      cpu: true,
      gpu: true,
      memory: true,
      zone: {
        select: {
          id: true,
          slug: true,
          argocdUrl: true,
          label: true,
        },
      },
    },
  })
}

export async function updateProjectClusterHistory(projectId: Project['id'], clusterIds: Cluster['id'][]) {
  return prisma.$transaction([
    prisma.projectClusterHistory.deleteMany({
      where: {
        AND: {
          projectId,
          clusterId: { notIn: clusterIds },
        },
      },
    }),
    prisma.projectClusterHistory.createMany({
      data: clusterIds.map(clusterId => ({ clusterId, projectId })),
      skipDuplicates: true,
    }),
  ])
}

export async function getClusterById(id: Cluster['id']) {
  return prisma.cluster.findUnique({
    where: { id },
    include: { kubeconfig: true },
  })
}

export async function getClusterByIdOrThrow(id: Cluster['id']) {
  return prisma.cluster.findUniqueOrThrow({
    where: { id },
    include: { kubeconfig: true, zone: true },
  })
}

export async function getClusterEnvironments(clusterId: Cluster['id']) {
  return prisma.environment.findMany({
    where: { clusterId },
    select: {
      name: true,
      cpu: true,
      gpu: true,
      memory: true,
      project: {
        select: {
          slug: true,
          name: true,
          owner: true,
          members: true,
        },
      },
    },
  })
}

export async function getClusterDetails(id: Cluster['id']) {
  return prisma.cluster.findUniqueOrThrow({
    where: { id },
    select: {
      createdAt: true,
      projects: {
        select: {
          id: true,
        },
      },
      id: true,
      clusterResources: true,
      infos: true,
      label: true,
      privacy: true,
      kubeconfig: true,
      stages: true,
      updatedAt: true,
      zoneId: true,
      cpu: true,
      gpu: true,
      memory: true,
    },
  })
}

export async function getClustersByIds(clusterIds: Cluster['id'][]) {
  return prisma.cluster.findMany({
    where: {
      id: { in: clusterIds },
    },
    include: { kubeconfig: true },
  })
}

export async function getPublicClusters() {
  return prisma.cluster.findMany({
    where: { privacy: 'public' },
    include: { zone: true },
  })
}

export async function getClusterNamesByZoneId(zoneId: string) {
  const clusterNames = await prisma.cluster.findMany({
    where: { zoneId },
    select: {
      label: true,
    },
  })
  return clusterNames.map(({ label }) => label)
}

export async function getClusterByLabel(label: Cluster['label']) {
  return prisma.cluster.findUnique({ where: { label } })
}

export async function getClusterByEnvironmentId(id: Environment['id']) {
  return prisma.cluster.findMany({
    where: {
      environments: {
        some: { id },
      },
    },
    include: { kubeconfig: true },
  })
}

export async function getClustersWithProjectIdAndConfig() {
  return prisma.cluster.findMany({
    select: {
      id: true,
      stages: true,
      projects: {
        where: {
          status: { not: 'archived' },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
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

export async function listClusters(where: Prisma.ClusterWhereInput) {
  return prisma.cluster.findMany({
    where,
    select: {
      id: true,
      label: true,
      stages: true,
      clusterResources: true,
      privacy: true,
      infos: true,
      zoneId: true,
      cpu: true,
      gpu: true,
      memory: true,
    },
  })
}

export async function getProjectsByClusterId(id: Cluster['id']) {
  return (await prisma.cluster.findUniqueOrThrow({
    where: { id },
    select: { projects: true },
  }))?.projects
}

export async function listStagesByClusterId(id: Cluster['id']) {
  return (await prisma.cluster.findUniqueOrThrow({
    where: { id },
    select: { stages: true },
  }))?.stages
}

export async function createCluster(data: Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId' | 'secretName' | 'zoneId'>, kubeconfig: Pick<Kubeconfig, 'user' | 'cluster'>, zoneId: string) {
  return prisma.cluster.create({
    data: {
      ...data,
      // @ts-ignore
      kubeconfig: { create: kubeconfig },
      zone: {
        connect: { id: zoneId },
      },
    },
  })
}

export async function updateCluster(id: Cluster['id'], data: Partial<Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId'>>, kubeconfig: Pick<Kubeconfig, 'user' | 'cluster'>) {
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

export async function linkClusterToProjects(id: Cluster['id'], projectIds: Project['id'][]) {
  return prisma.cluster.update({
    where: { id },
    data: {
      projects: {
        connect: projectIds.map(projectId => ({ id: projectId })),
      },
    },
  })
}

export async function linkClusterToStages(id: Cluster['id'], stageIds: Stage['id'][]) {
  return prisma.cluster.update({
    where: { id },
    data: {
      stages: {
        connect: stageIds.map(stageId => ({ id: stageId })),
      },
    },
  })
}

export async function removeClusterFromProject(id: Cluster['id'], projectId: Project['id']) {
  return prisma.cluster.update({
    where: { id },
    data: {
      projects: {
        disconnect: {
          id: projectId,
        },
      },
    },
  })
}

export async function removeClusterFromStage(id: Cluster['id'], stageId: Stage['id']) {
  return prisma.cluster.update({
    where: { id },
    data: {
      stages: {
        disconnect: {
          id: stageId,
        },
      },
    },
  })
}

export async function deleteCluster(id: Cluster['id']) {
  return prisma.cluster.delete({
    where: { id },
  })
}
