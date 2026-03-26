import type { PureAbility } from '@casl/ability'
import type { PrismaQuery } from '@casl/prisma'
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { Request } from 'express'
import type { PrismaService } from '../../database/prisma.service'
import { AbilityBuilder } from '@casl/ability'
import { createPrismaAbility } from '@casl/prisma'
import { AdminAuthorized } from '@cpn-console/shared'
import { Injectable } from '@nestjs/common'
import { z } from 'zod'

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

export function createAbilityForUser(adminPermissions: bigint | string | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility)
  if (AdminAuthorized.Manage(adminPermissions)) {
    can('manage', 'all')
    return build()
  }
  if (AdminAuthorized.ManageUsers(adminPermissions)) can('manage', 'AdminUser')
  if (AdminAuthorized.ListUsers(adminPermissions)) can('read', 'AdminUser')
  if (AdminAuthorized.ManageProjects(adminPermissions)) can('manage', 'AdminProject')
  if (AdminAuthorized.ListProjects(adminPermissions)) can('read', 'AdminProject')
  if (AdminAuthorized.ManageRoles(adminPermissions)) can('manage', 'AdminRole')
  if (AdminAuthorized.ListRoles(adminPermissions)) can('read', 'AdminRole')
  if (AdminAuthorized.ManageClusters(adminPermissions)) can('manage', 'Cluster')
  if (AdminAuthorized.ListClusters(adminPermissions)) can('read', 'Cluster')
  if (AdminAuthorized.ManageZones(adminPermissions)) can('manage', 'Zone')
  if (AdminAuthorized.ListZones(adminPermissions)) can('read', 'Zone')
  if (AdminAuthorized.ManageStages(adminPermissions)) can('manage', 'Stage')
  if (AdminAuthorized.ListStages(adminPermissions)) can('read', 'Stage')
  if (AdminAuthorized.ManageAdminToken(adminPermissions)) can('manage', 'AdminToken')
  if (AdminAuthorized.ListAdminToken(adminPermissions)) can('read', 'AdminToken')
  if (AdminAuthorized.ManageSystem(adminPermissions)) can('manage', 'SystemSetting')
  if (AdminAuthorized.ListSystem(adminPermissions)) can('read', 'SystemSetting')
  return build()
}

@Injectable()
export class AbilityInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request & { user?: unknown, ability?: AppAbility }>()
    try {
      const parsed = z.object({ groups: z.array(z.string()) }).passthrough().parse(req.user)
      const roles = await this.prisma.adminRole.findMany({
        where: { oidcGroup: { in: parsed.groups } },
        select: { permissions: true },
      })
      const adminPermissions = roles.reduce<bigint>((acc, r) => acc | BigInt(r.permissions), 0n)
      req.ability = createAbilityForUser(adminPermissions)
    } catch {}
    return next.handle()
  }
}
