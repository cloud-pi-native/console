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
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

@Injectable()
export class ArgoCDDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
    })
  }
}
