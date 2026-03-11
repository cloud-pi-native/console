import { Inject, Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'

export const projectSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  plugins: {
    select: {
      pluginName: true,
      key: true,
      value: true,
    },
  },
  members: {
    select: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  repositories: {
    select: {
      id: true,
      internalRepoName: true,
      isInfra: true,
      isPrivate: true,
      externalRepoUrl: true,
      externalUserName: true,
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
export class GitlabDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
    })
  }

  async getProject(id: string): Promise<ProjectWithDetails | null> {
    return this.prisma.project.findUnique({
      where: { id },
      select: projectSelect,
    })
  }

  async getUser(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    })
  }
}
