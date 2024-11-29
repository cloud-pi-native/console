import type { Prisma, User } from '@prisma/client'
import { exclude } from '@cpn-console/shared'
import prisma from '@/prisma.js'
import { dbKeysExcluded } from '@/utils/queries-tools.js'

type UserCreate = Omit<User, 'createdAt' | 'updatedAt'>

// SELECT
export async function listUsers(where?: Prisma.UserWhereInput, orderBy?: Prisma.UserOrderByWithRelationInput[], skip?: number, take?: number) {
  return {
    data: await prisma.user.findMany({ where, orderBy, skip, take }),
    total: await prisma.user.count({ where }),
  }
}

export async function getUserInfos(id: User['id']) {
  const usr = await prisma.user.findMany({
    where: { id },
    include: {
      logs: true,
    },
  })
  return exclude(usr, dbKeysExcluded)
}

export function getMatchingUsers(where: Prisma.UserWhereInput) {
  return prisma.user.findMany({
    where,
    take: 5,
  })
}

export function getUserById(id: User['id']) {
  return prisma.user.findUnique({ where: { id } })
}

export function getUserOrThrow(id: User['id']) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
  })
}

export function getUserByEmail(email: User['email']) {
  return prisma.user.findUnique({ where: { email } })
}

// CREATE
export async function createUser({ id, email, firstName, lastName, type }: UserCreate) {
  const user = await getUserByEmail(email)
  if (user) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  return prisma.user.create({ data: { id, email, firstName, lastName, type } })
}

// UPDATE
export async function updateUserById({ id, email, firstName, lastName }: UserCreate) {
  const user = await getUserById(id)
  const isEmailAlreadyTaken = await getUserByEmail(email)
  if (!user) throw new Error('L\'utilisateur demandé n\'existe pas')
  if (isEmailAlreadyTaken) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  if (user && !isEmailAlreadyTaken) {
    return prisma.user.update({ where: { id }, data: { email, firstName, lastName } })
  }
}

// TECH
export function _createUser(data: Prisma.UserCreateInput) {
  return prisma.user.upsert({ where: { id: data.id }, create: data, update: data })
}
