import type { AdminRole as AdminRoleContract } from '@cpn-console/shared'
import type { AdminRole as PrismaAdminRole } from './admin-role-queries.utils'
import { adminRoleContract } from '@cpn-console/shared'

export type CreateAdminRoleBody = typeof adminRoleContract.createAdminRole.body._type
export type PatchAdminRolesBody = typeof adminRoleContract.patchAdminRoles.body._type

export const CreateAdminRoleBodySchema = adminRoleContract.createAdminRole.body
export const PatchAdminRolesBodySchema = adminRoleContract.patchAdminRoles.body

export function toAdminRole(role: PrismaAdminRole): AdminRoleContract {
  return {
    id: role.id,
    name: role.name,
    permissions: role.permissions.toString(),
    position: role.position,
    oidcGroup: role.oidcGroup,
    type: role.type ?? 'managed',
  }
}

export function toAdminRoles(roles: PrismaAdminRole[]): AdminRoleContract[] {
  return roles.map(toAdminRole)
}
