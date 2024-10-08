import { createHash } from 'node:crypto'
import type { Prisma, User } from '@prisma/client'
import type { userContract } from '@cpn-console/shared'
import { getMatchingUsers as getMatchingUsersQuery, getUsers as getUsersQuery } from '@/resources/queries-index.js'
import prisma from '@/prisma.js'
import type { UserDetails } from '@/types/index.js'
import { BadRequest400 } from '@/utils/errors.js'

export async function getUsers(query: typeof userContract.getAllUsers.query._type, relationType: 'OR' | 'AND' = 'AND') {
  const whereInputs: Prisma.UserWhereInput[] = []
  if (query.adminRoleIds?.length) {
    whereInputs.push({ adminRoleIds: { hasEvery: query.adminRoleIds } })
  }
  if (query.adminRoles?.length) {
    const roles = query.adminRoles
      ? await prisma.adminRole.findMany({ where: { name: { in: query.adminRoles } } })
      : []

    const adminRoleNameNotFound = query.adminRoles?.find(nameQueried => !roles.find(({ name }) => name === nameQueried))
    if (adminRoleNameNotFound) {
      return new BadRequest400(`Unable to find adminRole ${adminRoleNameNotFound}`)
    }
    whereInputs.push({ adminRoleIds: { hasEvery: roles.map(({ id }) => id) } })
  }
  if (query.memberOfIds) {
    whereInputs.push({
      AND: query.memberOfIds.map(id => ({
        OR: [
          { projectsOwned: { some: { id } } },
          { ProjectMembers: { some: { project: { id } } } },
        ],
      })),
    })
  }

  return getUsersQuery({ [relationType]: whereInputs })
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

export enum TokenSearchResult {
  NOT_FOUND = 'Not Found',
  INACTIVE = 'Not active',
  EXPIRED = 'Expired',
}

export async function logAdminToken(token: string): Promise<{ adminPerms: bigint, id: string, user: User | null } | TokenSearchResult> {
  const calculatedHash = createHash('sha256').update(token).digest('hex')
  const tokenRecord = await prisma.adminToken.findFirst({ where: { hash: calculatedHash }, include: { createdBy: true } })

  if (!tokenRecord) {
    return TokenSearchResult.NOT_FOUND
  }
  if (tokenRecord.status !== 'active') {
    return TokenSearchResult.INACTIVE
  }
  const currentDate = new Date()
  if (tokenRecord.expirationDate && currentDate.getTime() > tokenRecord.expirationDate?.getTime()) {
    return TokenSearchResult.EXPIRED
  }

  await prisma.adminToken.update({ where: { id: tokenRecord.id }, data: { lastUse: new Date() } })
  return {
    adminPerms: tokenRecord.permissions,
    id: tokenRecord.id,
    user: tokenRecord.createdBy,
  }
}
