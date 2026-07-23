import type { AdminRoleService } from './admin-role.service'
import type { adminRoleContract } from '@cpn-console/shared'
import { z } from 'zod'
import type { AdminRole } from './admin-role-queries.utils'

export type AdminRoleContract = Parameters<AdminRoleService['patch']>[0][number]
export type AdminRoleResponse = NonNullable<Awaited<ReturnType<AdminRoleService['list']>>>[number]

export interface AdminRoleMember {
  id: string
  email: string
  firstName: string
  lastName: string
}

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

export function makeAdminRoleMember(overrides: Partial<AdminRoleMember> = {}): AdminRoleMember {
  return {
    id: crypto.randomUUID(),
    email: 'user@example.com',
    firstName: 'First',
    lastName: 'Last',
    ...overrides,
  }
}

export function makeCreateAdminRoleBody(overrides: { name?: string } = {}): z.infer<typeof adminRoleContract.createAdminRole.body> {
  return {
    name: overrides.name ?? 'New role',
  }
}

export function makePatchAdminRoleBody(
  role: AdminRole,
  overrides: Partial<z.infer<typeof adminRoleContract.patchAdminRoles.body>[number]> = {},
): z.infer<typeof adminRoleContract.patchAdminRoles.body>[number] {
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
