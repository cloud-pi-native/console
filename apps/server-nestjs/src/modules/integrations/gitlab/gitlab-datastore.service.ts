import type { Prisma } from '@prisma/client'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'

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
      pluginName: true,
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

  async getRepositoryWithProjectSlug(repositoryId: string): Promise<{ internalRepoName: string, projectSlug: string } | null> {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      select: {
        internalRepoName: true,
        project: { select: { slug: true } },
      },
    })
    if (!repository) return null
    return { internalRepoName: repository.internalRepoName, projectSlug: repository.project.slug }
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

  async getAdminRoleWithMembers(id: string): Promise<{ id: string, oidcGroup: string | null, members: { id: string, email: string, firstName: string, lastName: string }[] } | null> {
    const role = await this.prisma.adminRole.findUnique({
      where: { id },
      select: {
        id: true,
        oidcGroup: true,
      },
    })
    if (!role) return null
    const members = await this.prisma.user.findMany({
      where: { adminRoleIds: { has: id } },
      select: { id: true, email: true, firstName: true, lastName: true },
    })
    return { ...role, members }
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

  async getZoneSlug(zoneId: string): Promise<string | null> {
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      select: { slug: true },
    })
    return zone?.slug ?? null
  }
}
