import type { PureAbility } from '@casl/ability'
import type { PrismaQuery } from '@casl/prisma'
import type { NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { AbilityBuilder } from '@casl/ability'
import { createPrismaAbility } from '@casl/prisma'
import { AdminAuthorized, ProjectAuthorized } from '@cpn-console/shared'
import { Injectable } from '@nestjs/common'

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

export interface AuthUser {
  adminPermissions?: bigint | string | null
  projectPermissions?: bigint | string
  roles?: string[]
}

export function createAbilityForUser(user: AuthUser | undefined): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility)
  const adminPermissions = user?.adminPermissions
  const projectPermissions = user?.projectPermissions
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
  const perms = { adminPermissions, projectPermissions }
  if (ProjectAuthorized.Manage(perms)) can('manage', 'Project')
  if (ProjectAuthorized.ListEnvironments(perms)) can('read', 'Environment')
  if (ProjectAuthorized.ManageEnvironments(perms)) can('manage', 'Environment')
  if (ProjectAuthorized.ListRepositories(perms)) can('read', 'Repository')
  if (ProjectAuthorized.ManageRepositories(perms)) can('manage', 'Repository')
  if (ProjectAuthorized.ListMembers(perms)) can('read', 'ProjectMember')
  if (ProjectAuthorized.ManageMembers(perms)) can('manage', 'ProjectMember')
  if (ProjectAuthorized.ListRoles(perms)) can('read', 'ProjectRole')
  if (ProjectAuthorized.ManageRoles(perms)) can('manage', 'ProjectRole')
  if (ProjectAuthorized.SeeSecrets(perms)) can('read', 'Secret')
  if (ProjectAuthorized.ReplayHooks(perms)) can('replay', 'Hook')
  return build()
}

@Injectable()
export class AbilityMiddleware implements NestMiddleware {
  use(req: Request & { user?: AuthUser, ability?: AppAbility }, _res: Response, next: NextFunction) {
    req.ability = createAbilityForUser(req.user)
    next()
  }
}
