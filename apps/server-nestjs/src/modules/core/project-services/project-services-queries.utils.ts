import type { Prisma } from '@prisma/client'

export const projectSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  clusters: {
    select: {
      id: true,
      label: true,
      privacy: true,
      clusterResources: true,
      infos: true,
      zone: {
        select: {
          id: true,
          slug: true,
          label: true,
          argocdUrl: true,
        },
      },
    },
  },
  environments: {
    select: {
      id: true,
      name: true,
      cpu: true,
      gpu: true,
      memory: true,
      autosync: true,
      createdAt: true,
      updatedAt: true,
      clusterId: true,
      cluster: {
        select: {
          zone: {
            select: {
              id: true,
              slug: true,
              label: true,
              argocdUrl: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect

export const projectPluginSelect = {
  key: true,
  pluginName: true,
  projectId: true,
  value: true,
} satisfies Prisma.ProjectPluginSelect

export const adminPluginSelect = {
  key: true,
  pluginName: true,
  value: true,
} satisfies Prisma.AdminPluginSelect

export const publicClusterSelect = {
  select: {
    id: true,
    label: true,
    privacy: true,
    clusterResources: true,
    infos: true,
    zone: {
      select: {
        id: true,
        slug: true,
        label: true,
        argocdUrl: true,
      },
    },
  },
} satisfies Prisma.ClusterFindManyArgs

export type ProjectPlugin = Prisma.ProjectPluginGetPayload<{
  select: typeof projectPluginSelect
}>

export type AdminPlugin = Prisma.AdminPluginGetPayload<{
  select: typeof adminPluginSelect
}>

export type PublicCluster = Prisma.ClusterGetPayload<{
  select: typeof publicClusterSelect.select
}>

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

export async function getServicesQueryData(tx: Prisma.TransactionClient, projectId: string) {
  return Promise.all([
    tx.project.findUnique({
      where: { id: projectId },
      select: projectSelect,
    }),
    tx.projectPlugin.findMany({
      where: { projectId },
      select: projectPluginSelect,
    }),
    tx.adminPlugin.findMany({
      select: adminPluginSelect,
    }),
    tx.cluster.findMany({
      where: { privacy: 'public' },
      select: publicClusterSelect.select,
    }),
  ])
}
