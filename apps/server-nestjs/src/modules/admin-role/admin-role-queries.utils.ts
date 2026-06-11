import type { Prisma } from '@prisma/client'

export const adminRoleSelect = {
  id: true,
  name: true,
  permissions: true,
  position: true,
  oidcGroup: true,
  type: true,
} satisfies Prisma.AdminRoleSelect

export type AdminRole = Prisma.AdminRoleGetPayload<{
  select: typeof adminRoleSelect
}>

export async function getAdminRoleMaxPosition(tx: Prisma.TransactionClient): Promise<number> {
  const role = await tx.adminRole.findFirst({
    orderBy: { position: 'desc' },
    select: { position: true },
  })

  return role?.position ?? -1
}

export async function createAdminRole(tx: Prisma.TransactionClient, name: string): Promise<{ role: AdminRole, members: { id: string, email: string, firstName: string, lastName: string }[] }> {
  const maxPosition = await getAdminRoleMaxPosition(tx)
  const role = await tx.adminRole.create({
    data: {
      name,
      permissions: 0n,
      position: maxPosition + 1,
    },
    select: adminRoleSelect,
  })

  const members = await tx.user.findMany({
    where: { adminRoleIds: { has: role.id } },
    select: { id: true, email: true, firstName: true, lastName: true },
  })

  return { role, members }
}

export async function getAdminRoleMemberCounts(tx: Prisma.TransactionClient): Promise<Record<string, number>> {
  const roles = await tx.adminRole.findMany({
    where: { oidcGroup: { equals: '' } },
    select: { id: true },
  })
  const roleIds = roles.map(role => role.id)
  const users = await tx.user.findMany({
    where: { adminRoleIds: { hasSome: roleIds } },
    select: { adminRoleIds: true },
  })

  const counts: Record<string, number> = Object.fromEntries(roleIds.map(roleId => [roleId, 0]))
  for (const { adminRoleIds } of users) {
    for (const roleId of adminRoleIds) {
      if (typeof counts[roleId] === 'number') counts[roleId]++
    }
  }

  return counts
}

export async function getRoles(tx: Prisma.TransactionClient): Promise<AdminRole[]> {
  return await tx.adminRole.findMany({
    orderBy: { position: 'asc' },
    select: adminRoleSelect,
  })
}
