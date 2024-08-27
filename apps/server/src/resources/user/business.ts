import type { Prisma, User } from '@prisma/client'
import type { userContract } from '@cpn-console/shared'
import { getMatchingUsers as getMatchingUsersQuery, getUsers as getUsersQuery } from '@/resources/queries-index.js'
import prisma from '@/prisma.js'
import type { UserDetails } from '@/types/index.js'

export function getUsers(query: typeof userContract.getAllUsers.query._type) {
  const where: Prisma.UserWhereInput = {}
  if (query.adminRoleId) {
    where.adminRoleIds = { has: query.adminRoleId }
  }
  return getUsersQuery(where)
}

export async function getMatchingUsers(query: typeof userContract.getMatchingUsers.query._type) {
  const AND: Prisma.UserWhereInput[] = []
  if (query.notInProjectId) {
    AND.push({ ProjectMembers: { none: { projectId: query.notInProjectId } } })
    AND.push({ projectsOwned: { none: { id: query.notInProjectId } } })
  }
  const filter = { contains: query.letters, mode: 'insensitive' } as const // Default value: default
  if (query.letters) {
    AND.push({
      OR: [{
        email: filter,
      }, {
        firstName: filter,
      }, {
        lastName: filter,
      }],
    })
  }

  return getMatchingUsersQuery({
    AND,
  })
}

export async function patchUsers(users: typeof userContract.patchUsers.body._type) {
  for (const user of users) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        adminRoleIds: user.adminRoleIds,
      },
    })
  }

  return prisma.user.findMany({
    where: {
      id: { in: users.map(({ id }) => id) },
    },
  })
}

export async function logUser({ id, email, groups, ...user }: UserDetails): Promise<User>
export async function logUser({ id, email, groups, ...user }: UserDetails, withAdminPerms: boolean): Promise<{ user: User, adminPerms: bigint }>
export async function logUser({ id, email, groups, ...user }: UserDetails, withwithAdminPerms?: boolean): Promise<User | { user: User, adminPerms: bigint }> {
  const userDb = await prisma.user.findUnique({
    where: { id },
  })
  const matchingAdminRoles = await prisma.adminRole.findMany({
    where: { OR: [{ oidcGroup: { in: groups } }, { id: { in: userDb?.adminRoleIds } }] },
  })

  const oidcRoleIds = matchingAdminRoles
    .filter(({ oidcGroup }) => oidcGroup && groups.includes(oidcGroup))
    .map(({ id }) => id)

  if (!userDb) {
    const createdUser = await prisma.user.create({ data: { email, id, ...user, adminRoleIds: [] } })
    if (withwithAdminPerms) {
      return {
        user: createdUser,
        adminPerms: matchingAdminRoles.reduce((acc, curr) => acc | curr.permissions, 0n),
      }
    }
    return prisma.user.create({ data: { email, id, ...user, adminRoleIds: [] } })
  }

  const nonOidcRoleIds = matchingAdminRoles
    .filter(({ oidcGroup, id }) => !oidcGroup && userDb.adminRoleIds.includes(id))
    .map(({ id }) => id)

  const updatedUser = await prisma.user.update({ where: { id }, data: { ...user, adminRoleIds: nonOidcRoleIds } }) // on enregistre en bdd uniquement les roles de l'utilisateurs qui ne viennent pas de keycloak
    .then(user => ({ ...user, adminRoleIds: [...user.adminRoleIds, ...oidcRoleIds] }))
  if (withwithAdminPerms) {
    return {
      user: updatedUser,
      adminPerms: matchingAdminRoles.reduce((acc, curr) => acc | curr.permissions, 0n),
    }
  }
  return updatedUser // mais on lui retourne tous ceux auxquels il est aussi attaché par oidc
}
