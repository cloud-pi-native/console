import type { Prisma } from '@cpn-console/database'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../cpin-module/infrastructure/database/prisma.service'

export const projectSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  owner: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      adminRoleIds: true,
    },
  },
  plugins: {
    select: {
      key: true,
      value: true,
    },
  },
  roles: {
    select: {
      id: true,
      oidcGroup: true,
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
          adminRoleIds: true,
        },
      },
      roleIds: true,
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
      where: {
        plugins: {
          some: {
            pluginName: 'gitlab',
          },
        },
      },
    })
  }

  async getProject(id: string): Promise<ProjectWithDetails | null> {
    return this.prisma.project.findUnique({
      where: { id },
      select: projectSelect,
    })
  }

  async getAdminPluginConfig(pluginName: string, key: string): Promise<string | null> {
    const result = await this.prisma.adminPlugin.findUnique({
      where: {
        pluginName_key: {
          pluginName,
          key,
        },
      },
      select: {
        value: true,
      },
    })
    return result?.value ?? null
  }

  async getAdminRolesByOidcGroups(oidcGroups: string[]): Promise<{ id: string, oidcGroup: string }[]> {
    return this.prisma.adminRole.findMany({
      where: {
        oidcGroup: {
          in: oidcGroups,
        },
      },
      select: {
        id: true,
        oidcGroup: true,
      },
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
