import type { Prisma, Project } from '@prisma/client'
import { getMatchingUsers as getMatchingUsersQuery, getProjectMembers as getProjectUsersQuery, getUsers as getUsersQuery } from '@/resources/queries-index.js'
import { userContract } from '@cpn-console/shared'
import prisma from '@/prisma.js'
import { UserDetails } from '@/types/index.js'

export const getUsers = (query: typeof userContract.getAllUsers.query._type) => {
  const where: Prisma.UserWhereInput = {}
  if (query.adminRoleId) {
    where.adminRoleIds = { has: query.adminRoleId }
  }
  return getUsersQuery(where)
}

export const getProjectUsers = async (projectId: Project['id']) => getProjectUsersQuery(projectId)

export const getMatchingUsers = async (query: typeof userContract.getMatchingUsers.query._type) => {
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

export const patchUsers = async (users: typeof userContract.patchUsers.body._type) => {
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

export const logUser = async ({ id, email, groups, ...user }: UserDetails) => {
  const matchingAdminRoles = await prisma.adminRole.findMany({
    where: { oidcGroup: { in: groups } },
  })

  const adminRoleIds = matchingAdminRoles.filter(({ oidcGroup }) => groups.includes(oidcGroup ?? '')).map(({ id }) => id)
  const userDb = await prisma.user.findUnique({
    where: { id },
  })
  return userDb
    ? prisma.user.update({ where: { id }, data: { ...user, adminRoleIds } })
    : prisma.user.create({ data: { email, id, ...user, adminRoleIds } })
}
