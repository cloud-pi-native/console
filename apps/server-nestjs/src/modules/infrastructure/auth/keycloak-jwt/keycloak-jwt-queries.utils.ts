import type { Prisma } from '@prisma/client'
import type { AuthRequirements } from '../auth.utils'

export const userSelect = {
  id: true,
  adminRoleIds: true,
  type: true,
} satisfies Prisma.UserSelect

export const userIdSelect = {
  id: true,
} satisfies Prisma.UserSelect

export type UserRecord = Prisma.UserGetPayload<{ select: ReturnType<typeof makeUserSelect> }>

export function makeUserSelect(requirements?: AuthRequirements): Prisma.UserSelect {
  const includeAdminRoleIds = requirements?.includeAdminRoleIds ?? true
  const includeUserType = requirements?.includeUserType ?? true
  return {
    id: true,
    ...(includeAdminRoleIds ? { adminRoleIds: true } : {}),
    ...(includeUserType ? { type: true } : {}),
  }
}

export function upsertUser(
  tx: Prisma.TransactionClient,
  payload: { sub: string, email: string, given_name: string, family_name: string },
  select: Prisma.UserSelect,
) {
  return tx.user.upsert({
    where: { id: payload.sub },
    create: {
      id: payload.sub,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      adminRoleIds: [],
      type: 'human',
      lastLogin: new Date().toISOString(),
    },
    update: {
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      lastLogin: new Date().toISOString(),
    },
    select,
  })
}

// Roles match the token groups (legacy parity), the persisted ids, or are global.
function adminRoleWhere(groups: string[], adminRoleIds: string[]): Prisma.AdminRoleWhereInput {
  return {
    OR: [
      { oidcGroup: { in: groups } },
      { id: { in: adminRoleIds } },
      { type: 'global' },
    ],
  }
}

export function listMatchingAdminRoles(tx: Prisma.TransactionClient, groups: string[], adminRoleIds: string[]) {
  return tx.adminRole.findMany({
    where: adminRoleWhere(groups, adminRoleIds),
    orderBy: { position: 'asc' },
  })
}
