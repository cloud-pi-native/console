import type { PureAbility } from '@casl/ability'
import type { PrismaQuery } from '@casl/prisma'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { RequestUser } from './auth.guard'
import { AbilityBuilder } from '@casl/ability'
import { createPrismaAbility } from '@casl/prisma'
import { AdminAuthorized } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { z } from 'zod'
import { PrismaService } from '../../database/prisma.service'

export type AppAction
  = 'manage'
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'replay'

export type AppSubject
  = 'all'
    | 'AdminUser'
    | 'AdminProject'
    | 'AdminRole'
    | 'AdminToken'
    | 'Cluster'
    | 'Environment'
    | 'Hook'
    | 'Project'
    | 'ProjectMember'
    | 'ProjectRole'
    | 'Repository'
    | 'Secret'
    | 'Stage'
    | 'SystemSetting'
    | 'Zone'

export type AppAbility = PureAbility<[AppAction, AppSubject], PrismaQuery>

const userGroupsSchema = z.object({ groups: z.array(z.string()) }).passthrough()

interface RequestAbility {
  ability?: AppAbility
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http')
      return true

    const request = context.switchToHttp().getRequest<Request & RequestAbility & RequestUser>()

    const parsed = userGroupsSchema.safeParse(request.user)
    if (!parsed.success)
      return true

    const perms = await this.getPermissions(parsed.data.groups)
    request.ability = createAbility(perms)

    return true
  }

  private async getPermissions(groups: string[]) {
    const roles = await this.prisma.adminRole.findMany({
      where: { oidcGroup: { in: groups } },
      select: { permissions: true },
    })
    return roles.reduce<bigint>((acc, r) => acc | BigInt(r.permissions), 0n)
  }
}

function createAbility(perms: bigint | string | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility)
  if (AdminAuthorized.Manage(perms)) {
    can('manage', 'all')
    return build()
  }
  if (AdminAuthorized.ManageUsers(perms)) can('manage', 'AdminUser')
  if (AdminAuthorized.ListUsers(perms)) can('read', 'AdminUser')
  if (AdminAuthorized.ManageProjects(perms)) can('manage', 'AdminProject')
  if (AdminAuthorized.ListProjects(perms)) can('read', 'AdminProject')
  if (AdminAuthorized.ManageRoles(perms)) can('manage', 'AdminRole')
  if (AdminAuthorized.ListRoles(perms)) can('read', 'AdminRole')
  if (AdminAuthorized.ManageClusters(perms)) can('manage', 'Cluster')
  if (AdminAuthorized.ListClusters(perms)) can('read', 'Cluster')
  if (AdminAuthorized.ManageZones(perms)) can('manage', 'Zone')
  if (AdminAuthorized.ListZones(perms)) can('read', 'Zone')
  if (AdminAuthorized.ManageStages(perms)) can('manage', 'Stage')
  if (AdminAuthorized.ListStages(perms)) can('read', 'Stage')
  if (AdminAuthorized.ManageAdminToken(perms)) can('manage', 'AdminToken')
  if (AdminAuthorized.ListAdminToken(perms)) can('read', 'AdminToken')
  if (AdminAuthorized.ManageSystem(perms)) can('manage', 'SystemSetting')
  if (AdminAuthorized.ListSystem(perms)) can('read', 'SystemSetting')
  return build()
}
