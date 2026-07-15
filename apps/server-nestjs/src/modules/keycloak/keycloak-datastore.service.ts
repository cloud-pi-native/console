import type { Prisma } from '@prisma/client'
import { ENABLED } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { AUTO_SYNC_PLUGIN_KEY, PLUGIN_NAME, SUSPENDED_PLUGIN_KEY } from './keycloak.constants'

export const projectSelect = {
  id: true,
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

export const adminRoleSelect = {
  id: true,
  oidcGroup: true,
  type: true,
} satisfies Prisma.AdminRoleSelect

export type AdminRoleWithDetails = Prisma.AdminRoleGetPayload<{
  select: typeof adminRoleSelect
}>

export const userAdminRoleSelect = {
  id: true,
  adminRoleIds: true,
} satisfies Prisma.UserSelect

export type UserWithAdminRoles = Prisma.UserGetPayload<{
  select: typeof userAdminRoleSelect
}>

@Injectable()
export class KeycloakDatastoreService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
    })
  }

  async getAutoSyncProjects(): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      select: projectSelect,
      where: {
        AND: [
          {
            plugins: {
              some: {
                pluginName: PLUGIN_NAME,
                key: AUTO_SYNC_PLUGIN_KEY,
                value: ENABLED,
              },
            },
          },
          {
            NOT: {
              plugins: {
                some: {
                  pluginName: PLUGIN_NAME,
                  key: SUSPENDED_PLUGIN_KEY,
                  value: ENABLED,
                },
              },
            },
          },
        ],
      },
    })
  }

  async getAllAdminRoles(): Promise<AdminRoleWithDetails[]> {
    return this.prisma.adminRole.findMany({
      select: adminRoleSelect,
    })
  }

  async getAllUsersWithAdminRoleIds(): Promise<UserWithAdminRoles[]> {
    return this.prisma.user.findMany({
      select: userAdminRoleSelect,
    })
  }
}
