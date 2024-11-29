import { createHash } from 'node:crypto'
import type { AdminRole, AdminToken, PersonalAccessToken, Prisma, User } from '@prisma/client'
import type { XOR, userContract } from '@cpn-console/shared'
import { getMatchingUsers as getMatchingUsersQuery, listUsers as listUsersQuery } from '@/resources/queries-index.js'
import prisma from '@/prisma.js'
import type { UserDetails } from '@/types/index.js'
import type { ErrorResType } from '@/utils/errors.js'
import { BadRequest400, NotFound404 } from '@/utils/errors.js'

export async function listUsers(query: typeof userContract.listUsers.query._type): Promise<typeof userContract.listUsers.responses['200']['_input'] | ErrorResType> {
  const {
    adminRoleIds,
    adminRoles,
    email,
    firstName,
    lastName,
    memberOfIds,
    order = 'asc',
    orderBy = 'lastLogin',
    relationType = 'AND',
    search,
    type,
    page = 0,
    perPage = 20,
  } = query
  const whereInputs: Prisma.UserWhereInput[] = []
  const orderInputs: Prisma.UserOrderByWithRelationInput[] = [{ [orderBy]: order }, { id: 'asc' }]

  if (adminRoleIds?.length) whereInputs.push({ adminRoleIds: { hasEvery: adminRoleIds } })

  if (adminRoles?.length) {
    const roles = adminRoles
      ? await prisma.adminRole.findMany({ where: { name: { in: adminRoles } } })
      : []

    const adminRoleNameNotFound = adminRoles?.find(nameQueried => !roles.find(({ name }) => name === nameQueried))
    if (adminRoleNameNotFound) {
      return new BadRequest400(`Unable to find adminRole ${adminRoleNameNotFound}`)
    }
    whereInputs.push({ adminRoleIds: { hasEvery: roles.map(({ id }) => id) } })
  }
  if (memberOfIds) {
    whereInputs.push({
      AND: memberOfIds.map(id => ({
        OR: [
          { projectsOwned: { some: { id } } },
          { ProjectMembers: { some: { project: { id } } } },
        ],
      })),
    })
  }

  if (email) whereInputs.push({ email: { contains: email, mode: 'insensitive' } })
  if (firstName) whereInputs.push({ firstName: { contains: firstName, mode: 'insensitive' } })
  if (lastName) whereInputs.push({ lastName: { contains: lastName, mode: 'insensitive' } })
  if (type) whereInputs.push({ type })

  if (search) {
    whereInputs.push({ OR: [
      { email: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
    ] })
  }

  const offset = page * perPage
  const users = await listUsersQuery({
    [relationType]: whereInputs,
  }, orderInputs, offset, perPage)

  return {
    ...users,
    offset,
  }
}

export async function getMatchingUsers(query: typeof userContract.getMatchingUsers.query._type) {
  const AND: Prisma.UserWhereInput[] = []
  if (query.notInProjectId) {
    AND.push({ projectMembers: { none: { projectId: query.notInProjectId } } })
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
    AND.push({ type: 'human' })
  }

  return getMatchingUsersQuery({
    AND,
  })
}

export async function getUser(userId: User['id']) {
  const user = await prisma.user.findUnique(({ where: { id: userId }, include: { projectMembers: true, projectsOwned: true } }))
  if (!user) return new NotFound404()
  return user
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

export enum TokenInvalidReason {
  INACTIVE = 'Not active',
  EXPIRED = 'Expired',
  NOT_FOUND = 'Not authenticated',
}

type UserTrial = Omit<UserDetails, 'type'>
export async function logViaSession({ id, email, groups, ...user }: UserTrial): Promise<{ user: User, adminPerms: bigint }> {
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
    const createdUser = await prisma.user.create({ data: { email, id, ...user, adminRoleIds: [], type: 'human' } })
    return {
      user: createdUser,
      adminPerms: sumAdminPerms(matchingAdminRoles),
    }
  }

  const nonOidcRoleIds = matchingAdminRoles
    .filter(({ oidcGroup, id }) => !oidcGroup && userDb.adminRoleIds.includes(id))
    .map(({ id }) => id)

  const updatedUser = await prisma.user.update({ where: { id }, data: { ...user, adminRoleIds: nonOidcRoleIds, lastLogin: (new Date()).toISOString() } }) // on enregistre en bdd uniquement les roles de l'utilisateurs qui ne viennent pas de keycloak
    .then(user => ({ ...user, adminRoleIds: [...user.adminRoleIds, ...oidcRoleIds] }))
  return {
    user: updatedUser,
    adminPerms: matchingAdminRoles.reduce((acc, curr) => acc | curr.permissions, 0n),
  }
}

type UserWithTokenId = Omit<User, 'adminRoleIds'> & { tokenId: string }
export async function logViaToken(pass: string): Promise<({ user: UserWithTokenId, adminPerms: bigint }) | TokenInvalidReason> {
  const passHash = createHash('sha256').update(pass).digest('hex')

  let token: (XOR<AdminToken, PersonalAccessToken> & { owner: User }) | TokenInvalidReason | undefined
  const tokenLoginMethods = [findPersonalAccessToken, findAdminToken]
  for (const tokenLoginMethod of tokenLoginMethods) {
    token = await tokenLoginMethod(passHash)
    if (token) {
      break
    }
  }

  if (typeof token === 'string') {
    return token
  }
  if (!token) {
    return TokenInvalidReason.NOT_FOUND
  }

  return {
    user: {
      ...token.owner,
      tokenId: token.id,
    },
    adminPerms: token?.permissions ?? await getAdminRolesAndSum(token.owner.adminRoleIds),
  }
}

function isTokenInvalid(token: AdminToken | PersonalAccessToken): TokenInvalidReason | undefined {
  if (token.status !== 'active') {
    return TokenInvalidReason.INACTIVE
  }
  const currentDate = new Date()
  if (token.expirationDate && currentDate.getTime() > token.expirationDate?.getTime()) {
    return TokenInvalidReason.EXPIRED
  }
}

function sumAdminPerms(roles: AdminRole[]): bigint {
  if (!roles.length) {
    return 0n
  }
  return roles.reduce((acc, curr) => acc | curr.permissions, 0n)
}

async function getAdminRolesAndSum(roles: AdminRole['id'][] | null): Promise<bigint> {
  if (!roles?.length) {
    return 0n
  }
  return sumAdminPerms(await prisma.adminRole.findMany({
    where: { id: { in: roles } },
  }))
}

// List all token tpe authentication
async function findPersonalAccessToken(digest: string): Promise<(PersonalAccessToken & { owner: User }) | undefined | TokenInvalidReason> {
  const token = await prisma.personalAccessToken.findFirst({ where: { hash: digest }, include: { owner: true } })
  if (!token)
    return undefined
  const invalidReason = isTokenInvalid(token)
  if (invalidReason) {
    return invalidReason
  }
  await prisma.personalAccessToken.update({ where: { id: token.id }, data: { lastUse: (new Date()).toISOString() } })
  await prisma.user.update({ where: { id: token.owner.id }, data: { lastLogin: (new Date()).toISOString() } })
  return token
}

async function findAdminToken(digest: string): Promise<(AdminToken & { owner: User }) | undefined | TokenInvalidReason> {
  const token = await prisma.adminToken.findFirst({ where: { hash: digest }, include: { owner: true } })
  if (!token)
    return undefined
  const invalidReason = isTokenInvalid(token)
  if (invalidReason) {
    return invalidReason
  }
  await prisma.adminToken.update({ where: { id: token.id }, data: { lastUse: (new Date()).toISOString() } })
  await prisma.user.update({ where: { id: token.userId }, data: { lastLogin: (new Date()).toISOString() } })
  return token
}
