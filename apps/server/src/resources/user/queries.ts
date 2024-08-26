import type { Prisma, User } from '@prisma/client'
import { exclude } from '@cpn-console/shared'
import prisma from '@/prisma.js'
import { dbKeysExcluded } from '@/utils/queries-tools.js'

type UserCreate = Omit<User, 'createdAt' | 'updatedAt'>

// SELECT
export const getUsers = (where?: Prisma.UserWhereInput) => prisma.user.findMany({ where })

export const getUserInfos = async (id: User['id']) => {
  const usr = await prisma.user.findMany({
    where: { id },
    include: {
      logs: true,
    },
  })
  return exclude(usr, dbKeysExcluded)
}

export const getMatchingUsers = (where: Prisma.UserWhereInput) =>
  prisma.user.findMany({
    where,
    take: 5,
  })

export const getUserById = (id: User['id']) =>
  prisma.user.findUnique({ where: { id } })

export const getUserOrThrow = (id: User['id']) =>
  prisma.user.findUniqueOrThrow({
    where: { id },
  })

export const getUserByEmail = (email: User['email']) =>
  prisma.user.findUnique({ where: { email } })

// CREATE
export const createUser = async ({ id, email, firstName, lastName }: UserCreate) => {
  const user = await getUserByEmail(email)
  if (user) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  return prisma.user.create({ data: { id, email, firstName, lastName } })
}

// UPDATE
export const updateUserById = async ({ id, email, firstName, lastName }: UserCreate) => {
  const user = await getUserById(id)
  const isEmailAlreadyTaken = await getUserByEmail(email)
  if (!user) throw new Error('L\'utilisateur demandé n\'existe pas')
  if (isEmailAlreadyTaken) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  if (user && !isEmailAlreadyTaken) {
    return prisma.user.update({ where: { id }, data: { email, firstName, lastName } })
  }
}

// TECH
export const _createUser = (data: Prisma.UserCreateInput) =>
  prisma.user.upsert({ where: { id: data.id }, create: data, update: data })
