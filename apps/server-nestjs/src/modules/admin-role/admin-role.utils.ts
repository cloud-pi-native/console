import type { AdminRole } from '@cpn-console/shared'
import type { AdminRole as PrismaAdminRole } from '@prisma/client'

export function toAdminRole(role: PrismaAdminRole): AdminRole {
  return {
    id: role.id,
    name: role.name,
    permissions: role.permissions.toString(),
    position: role.position,
    oidcGroup: role.oidcGroup,
    type: role.type ?? 'managed',
  }
}

export function toAdminRoles(roles: PrismaAdminRole[]): AdminRole[] {
  return roles.map(toAdminRole)
}
