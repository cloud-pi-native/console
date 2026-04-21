import type { Prisma } from '@cpn-console/database'
import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../cpin-module/infrastructure/database/prisma.service'

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
} satisfies Prisma.ProjectSelect

export type ProjectWithDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

export const adminRoleSelect = {
  id: true,
  oidcGroup: true,
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
