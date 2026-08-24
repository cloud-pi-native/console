import type { AdminRole } from './admin-role-queries.utils'
import type { AdminRoleService } from './admin-role.service'
import type { CreateAdminRoleBody, PatchAdminRolesBody } from './admin-role.utils'

export function makeAdminRole(overrides: Partial<AdminRole> = {}): AdminRole {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'New role',
    permissions: overrides.permissions ?? 0n,
    position: overrides.position ?? 0,
    oidcGroup: overrides.oidcGroup ?? '',
    type: overrides.type ?? 'managed',
    ...overrides,
  }
}

export function makeCreateAdminRoleBody(overrides: { name?: string } = {}): CreateAdminRoleBody {
  return {
    name: overrides.name ?? 'New role',
  }
}

export function makePatchAdminRoleBody(
  role: AdminRole,
  overrides: Partial<PatchAdminRolesBody[number]> = {},
): PatchAdminRolesBody[number] {
  return {
    id: role.id,
    name: overrides.name ?? role.name,
    permissions:
      overrides.permissions
      ?? (typeof role.permissions === 'bigint' ? role.permissions.toString() : String(role.permissions)),
    position: overrides.position ?? role.position,
    oidcGroup: overrides.oidcGroup ?? role.oidcGroup,
    type: overrides.type ?? role.type,
    ...overrides,
  }
}
