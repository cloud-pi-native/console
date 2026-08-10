import type { Prisma } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'

export const projectSelect = {
  id: true,
  name: true,
  slug: true,
  ownerId: true,
  everyonePerms: true,
  members: {
    select: {
      roleIds: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  },
  roles: {
    select: {
      id: true,
      permissions: true,
      oidcGroup: true,
      type: true,
    },
  },
  environments: {
    select: {
      id: true,
      name: true,
      stage: {
        select: {
          name: true,
        },
      },
    },
  },
  plugins: {
    select: {
      pluginName: true,
      key: true,
      value: true,
    },
  },
} satisfies Prisma.ProjectSelect

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

const projectInfosSelect = {
  slug: true,
  environments: {
    select: {
      stage: {
        select: { name: true },
      },
    },
  },
} satisfies Prisma.ProjectSelect

export type ProjectForInfos = Prisma.ProjectGetPayload<{
  select: typeof projectInfosSelect
}>

@Injectable()
export class ObservabilityDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProjectForInfos(id: string): Promise<ProjectForInfos | null> {
    return this.prisma.project.findUnique({
      where: { id },
      select: projectInfosSelect,
    })
  }
}
