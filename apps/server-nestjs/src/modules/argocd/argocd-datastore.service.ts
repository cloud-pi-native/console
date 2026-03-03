import { Injectable, Logger } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import type { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'

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
      clusterId: true,
      cpu: true,
      gpu: true,
      memory: true,
      autosync: true,
    },
  },
  clusters: {
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
} satisfies Prisma.ProjectSelect

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

@Injectable()
export class ArgoCDDatastoreService {
  private readonly logger = new Logger(ArgoCDDatastoreService.name)

  constructor(private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
    })
  }
}
