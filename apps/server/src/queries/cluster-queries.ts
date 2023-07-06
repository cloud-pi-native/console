import type { Cluster, Environment, Project } from '@prisma/client'
import prisma from '@/prisma.js'

// prisma.cluster
export const getClusterById = (id: Cluster['id']) => prisma.cluster.findUnique({ where: { id } })

export const getClustersByIds = (clusterIds: Cluster['id'][]) => prisma.cluster.findMany({
  where: {
    id: {
      in: clusterIds,
    },
  },
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
})

export const getClustersWithProjectId = () => prisma.cluster.findMany({
  select: {
    id: true,
    projects: {
      select: {
        id: true,
        name: true,
      },
    },
    clusterResources: true,
    label: true,
    privacy: true,
    secretName: true,
    cluster: true,
    user: true,
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

export const createCluster = (data: Parameters<typeof prisma.cluster.create>[0]['data']) => prisma.cluster.upsert({
  create: data,
  update: data,
  where: {
    label: data.label,
  },
})

export const updateCluster = (id: Cluster['id'], data: Parameters<typeof prisma.cluster.update>[0]['data']) => prisma.cluster.update({
  where: {
    id,
  },
  data,
})

export const addClusterToProjectWithIds = (id: Cluster['id'], projectId: Project['id']) => prisma.cluster.update({
  where: {
    id,
  },
  data: {
    projects: {
      connect: {
        id: projectId,
      },
    },
  },
})
// await prisma.cluster.update({
//   where: {
//     id: '595f90f7-d574-4361-a4af-45182aef6e8b',
//   },
//   data: {
//     projects: {
//       connect: {
//         id: 'bbb4a035-9cd2-4e5a-bfe7-525f3ac7a316',
//       },
//     },
//   },
// })
// console.log(
// await prisma.cluster.findUnique({
//   where: { label: 'dvdvdfb' },
//   select: {
//     projects: true,
//   },
// })
// )

// await addClusterToProjectWithIds('595f90f7-d574-4361-a4af-45182aef6e8b', 'a0a40f79-c64c-4784-bc6d-16fbcc3df42f')

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

export const addClusterToEnvironment = (id: Cluster['id'], environmentId: Environment['id']) => prisma.cluster.update({
  where: {
    id,
  },
  data: {
    environments: {
      connect: {
        id: environmentId,
      },
    },
  },
})

export const removeClusterFromEnvironment = (id: Cluster['id'], environmentId: Environment['id']) => prisma.cluster.update({
  where: {
    id,
  },
  data: {
    projects: {
      disconnect: {
        id: environmentId,
      },
    },
  },
})

export const _dropClusterTable = () => prisma.cluster.deleteMany({})
