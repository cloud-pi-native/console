import type { Prisma } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'

export const projectSelect = {
  id: true,
  name: true,
  slug: true,
  plugins: {
    select: {
      pluginName: true,
      key: true,
      value: true,
    },
  },
  repositories: {
    select: {
      id: true,
      internalRepoName: true,
      isInfra: true,
      helmValuesFiles: true,
      deployRevision: true,
      deployPath: true,
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
      cluster: {
        select: {
          id: true,
          label: true,
          zone: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  },
  deployments: {
    select: {
      id: true,
      name: true,
      autosync: true,
      environment: {
        select: {
          id: true,
          name: true,
          cluster: {
            select: {
              id: true,
              label: true,
              zone: {
                select: {
                  slug: true,
                },
              },
            },
          },
          cpu: true,
          gpu: true,
          memory: true,
          autosync: true,
        },
      },
      deploymentSources: {
        select: {
          type: true,
          path: true,
          targetRevision: true,
          helmValuesFiles: true,
          repository: {
            select: {
              id: true,
              internalRepoName: true,
            },
          },
          internalValueSources: {
            orderBy: { order: 'asc' },
            select: {
              order: true,
              path: true,
            },
          },
          externalValueSource: {
            select: {
              order: true,
              path: true,
              ref: true,
              targetRevision: true,
              repository: {
                select: {
                  internalRepoName: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

export const clusterSelect = {
  label: true,
  clusterResources: true,
  kubeconfig: {
    select: {
      cluster: true,
      user: true,
    },
  },
  zone: {
    select: {
      id: true,
      slug: true,
    },
  },
} satisfies Prisma.ClusterSelect

export type ClusterWithZone = Prisma.ClusterGetPayload<{
  select: typeof clusterSelect
}>

@Injectable()
export class ArgoCDDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
    })
  }

  async getAllZoneSlugs(): Promise<string[]> {
    const zones = await this.prisma.zone.findMany({
      select: { slug: true },
    })
    return zones.map(zone => zone.slug)
  }

  async getCluster(clusterId: string): Promise<ClusterWithZone | null> {
    return this.prisma.cluster.findUnique({
      where: { id: clusterId },
      select: clusterSelect,
    })
  }

  async getZoneClusterNames(zoneId: string): Promise<string[]> {
    const zones = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      select: { clusters: { select: { label: true } } },
    })
    return zones?.clusters.map(({ label }) => label) ?? []
  }

  async getZoneSlug(zoneId: string): Promise<string | null> {
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      select: { slug: true },
    })
    return zone?.slug ?? null
  }
}
