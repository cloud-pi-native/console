import type { User } from '@prisma/client'
import prisma from '@/prisma.js'
import { dbKeysExcluded, exclude } from '@/utils/queries-tools.js'

type UserCreate = Omit<User, 'createdAt' | 'updatedAt'>;

// SELECT
export const getUsers = async () => {
  return prisma.user.findMany()
}

export const getUserInfos = async (id: User['id']) => {
  const usr = await prisma.user.findMany({
    where: { id },
    include: {
      logs: true,
      permissions: true,
      roles: true,
    },
  })
  const usrWithKeysExcluded = exclude(usr, dbKeysExcluded)

  return usrWithKeysExcluded
}

export const getMatchingUsers = async (letters: string) => {
  return prisma.user.findMany({
    where: {
      email: {
        contains: letters,
      },
    },
    take: 5,
  })
}

export const getUserById = async (id: User['id']) => {
  return prisma.user.findUnique({ where: { id } })
}

export const getOrCreateUser = async (user: Parameters<typeof prisma.user.upsert>[0]['create']) => prisma.user.upsert({
  where: { id: user.id },
  update: user,
  create: user,
})

export const getUserByEmail = async (email: User['email']) => {
  const res = await prisma.user.findUnique({ where: { email } })
  return res
}

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
    const res = await prisma.user.update({ where: { id }, data: { email, firstName, lastName } })
    return res
  }
}

// TECH
export const _dropUsersTable = async () => {
  await prisma.user.deleteMany({})
}

export const _createUser = async (data: Parameters<typeof prisma.user.create>[0]['data']) => {
  return prisma.user.upsert({ where: { id: data.id }, create: data, update: data })
}
