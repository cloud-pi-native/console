import type { Prisma } from '@prisma/client'
import { PROJECT_PERMS } from '@cpn-console/shared'

export interface ProjectRequirements {
  includeStatus?: boolean
  includeLocked?: boolean
  includePermissions?: boolean
}

export function makeProjectSelect(requirements?: ProjectRequirements): Prisma.ProjectSelect {
  const includePermissions = requirements?.includePermissions ?? true
  const includeStatus = requirements?.includeStatus ?? true
  const includeLocked = requirements?.includeLocked ?? true

  return {
    id: true,
    slug: true,
    ...(includeStatus ? { status: true } : {}),
    ...(includeLocked ? { locked: true } : {}),
    ...(includePermissions
      ? {
          ownerId: true,
          everyonePerms: true,
          roles: { select: { id: true, permissions: true } },
          members: { select: { userId: true, roleIds: true } },
        }
      : {}),
  } satisfies Prisma.ProjectSelect
}

export function resolveProjectPermissions(
  raw: { ownerId: string, everyonePerms: bigint, roles: Array<{ id: string, permissions: bigint }>, members: Array<{ userId: string, roleIds: string[] }> },
  userId: string,
): bigint {
  if (raw.ownerId === userId) {
    return PROJECT_PERMS.MANAGE
  }

  const member = raw.members.find(m => m.userId === userId)
  if (!member) {
    return 0n
  }

  const memberRoles = raw.roles.filter(role => member.roleIds.includes(role.id))
  return memberRoles.reduce(
    (acc, curr) => acc | curr.permissions,
    raw.everyonePerms | PROJECT_PERMS.GUEST,
  )
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
