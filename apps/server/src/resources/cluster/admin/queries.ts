import type { Cluster, Environment, Kubeconfig, Project, Stage } from '@prisma/client'
import prisma from '@/prisma.js'

// prisma.cluster
export const getClusterById = (id: Cluster['id']) => prisma.cluster.findUnique({
  where: { id },
  include: {
    kubeconfig: true,
  },
})

export const getClusterEnvironments = (id: Cluster['id']) => prisma.cluster.findUnique({
  where: { id },
  select: {
    environments: {
      select: {
        name: true,
        project: {
          select: {
            name: true,
            organization: {
              select: {
                name: true,
              },
            },
            roles: {
              select: {
                role: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
})

export const getClustersByIds = (clusterIds: Cluster['id'][]) => prisma.cluster.findMany({
  where: {
    id: {
      in: clusterIds,
    },
  },
  include: {
    kubeconfig: true,
  },
})

export const getPublicClusters = () => prisma.cluster.findMany({
  where: {
    privacy: 'public',
  },
  include: { stages: true },
})

export const getClusterByLabel = (label: Cluster['label']) => prisma.cluster.findUnique({ where: { label } })

export const getClusterByEnvironmentId = (id: Environment['id']) => prisma.cluster.findMany({
  where: {
    environments: {
      some: {
        id,
      },
    },
  },
  include: {
    kubeconfig: true,
  },
})

export const getClustersWithProjectIdAndConfig = () => prisma.cluster.findMany({
  select: {
    id: true,
    stages: true,
    projects: {
      select: {
        id: true,
        name: true,
        organization: {
          select: {
            name: true,
          },
        },
        status: true,
      },
    },
    clusterResources: true,
    label: true,
    infos: true,
    privacy: true,
    secretName: true,
    kubeconfig: true,
  },
})

export const getProjectsByClusterId = async (id: Cluster['id']) => (await prisma.cluster.findUnique({
  where: {
    id,
  },
  select: {
    projects: true,
  },
})).projects

export const getStagesByClusterId = async (id: Cluster['id']) => (await prisma.cluster.findUnique({
  where: {
    id,
  },
  select: {
    stages: true,
  },
})).stages

export const createCluster = (
  data: Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId' | 'secretName'>,
  kubeconfig: Pick<Kubeconfig, 'user' | 'cluster'>,
) => prisma.cluster.create({
  data: {
    ...data,
    kubeconfig: {
      create: kubeconfig,
    },
  },
})

export const updateCluster = (
  id: Cluster['id'],
  data: Partial<Omit<Cluster, 'id' | 'updatedAt' | 'createdAt' | 'kubeConfigId'>>,
  kubeconfig: Pick<Kubeconfig, 'user' | 'cluster'>,
) => prisma.cluster.update({
  where: {
    id,
  },
  data: {
    ...data,
    kubeconfig: {
      update: kubeconfig,
    },
  },
})

export const linkClusterToProjects = (id: Cluster['id'], projectIds: Project['id'][]) => prisma.cluster.update({
  where: {
    id,
  },
  data: {
    projects: {
      connect: projectIds.map(projectId => ({ id: projectId })),
    },
  },
})

export const linkClusterToStages = async (id: Cluster['id'], stageIds: Stage['id'][]) => prisma.cluster.update({
  where: {
    id,
  },
  data: {
    stages: {
      connect: stageIds.map(stageId => ({ id: stageId })),
    },
  },
})

export const removeClusterFromProject = (id: Cluster['id'], projectId: Project['id']) => prisma.cluster.update({
  where: {
    id,
  },
  data: {
    projects: {
      disconnect: {
        id: projectId,
      },
    },
  },
})

export const removeClusterFromStage = (id: Cluster['id'], stageId: Stage['id']) => prisma.cluster.update({
  where: {
    id,
  },
  data: {
    stages: {
      disconnect: {
        id: stageId,
      },
    },
  },
})

export const deleteCluster = (id: Cluster['id']) => prisma.cluster.delete({
  where: {
    id,
  },
})

export const _dropClusterTable = () => prisma.cluster.deleteMany({})
export const _dropKubeconfigTable = () => prisma.kubeconfig.deleteMany({})
