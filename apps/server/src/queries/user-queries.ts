import { Users } from '@prisma/client'
import prisma from '@/prisma.js'
import { dbKeysExcluded, exclude } from '../utils/queries-tools.js'

type UserCreate = Omit<Users, 'createdAt' | 'updatedAt'>;

// SELECT
export const getUsers = async () => {
  return prisma.users.findMany()
}

export const getUserInfos = async (id: Users['id']) => {
  const usr = await prisma.users.findMany({
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

export const getUserById = async (id: Users['id']) => {
  return prisma.users.findUnique({ where: { id } })
}

export const getOrCreateUser = async (user: UserCreate) => {
  return await prisma.users.upsert({
    where: { id: user.id },
    update: user,
    create: user,
  })
}

export const getUserByEmail = async (email: Users['email']) => {
  const res = await prisma.users.findUnique({ where: { email } })
  return res
}

// CREATE
export const createUser = async ({ id, email, firstName, lastName }: UserCreate) => {
  const user = await getUserByEmail(email)
  if (user) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  return prisma.users.create({ data: { id, email, firstName, lastName } })
}

// UPDATE
export const updateUserById = async ({ id, email, firstName, lastName }: UserCreate) => {
  const user = await getUserById(id)
  const isEmailAlreadyTaken = await getUserByEmail(email)
  if (!user) throw new Error('L\'utilisateur demandé n\'existe pas')
  if (isEmailAlreadyTaken) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  if (user && !isEmailAlreadyTaken) {
    const res = await prisma.users.update({ where: { id }, data: { email, firstName, lastName } })
    return res
  }
}

// TECH
export const _dropUsersTable = async () => {
  await prisma.users.deleteMany({})
}
