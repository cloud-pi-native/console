import type { User } from '@prisma/client'
import { exclude } from '@cpn-console/shared'
import prisma from '@/prisma.js'
import { dbKeysExcluded } from '@/utils/queries-tools.js'

type UserCreate = Omit<User, 'createdAt' | 'updatedAt'>;

// SELECT
export const getUsers = prisma.user.findMany

export const getUserInfos = async (id: User['id']) => {
  const usr = await prisma.user.findMany({
    where: { id },
    include: {
      logs: true,
      permissions: true,
      roles: true,
    },
  })
  return exclude(usr, dbKeysExcluded)
}

export const getMatchingUsers = (letters: string) =>
  prisma.user.findMany({
    where: {
      email: {
        contains: letters,
      },
    },
    take: 5,
  })

export const getUserById = (id: User['id']) =>
  prisma.user.findUnique({ where: { id } })

export const getOrCreateUser = (user: Parameters<typeof prisma.user.upsert>[0]['create']) =>
  prisma.user.upsert({
    where: { id: user.id },
    update: user,
    create: user,
  })

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
export const _dropUsersTable = prisma.user.deleteMany

export const _createUser = (data: Parameters<typeof prisma.user.create>[0]['data']) =>
  prisma.user.upsert({ where: { id: data.id }, create: data, update: data })
