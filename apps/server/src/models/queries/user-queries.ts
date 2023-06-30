import { prisma } from '../../connect.js'
import { dbKeysExcluded, exclude } from '../../utils/queries-tools.js'
import { User } from '@prisma/client'

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
      UsersProjects: true,
    },
  })
  const usrWithKeysExcluded = exclude(usr, dbKeysExcluded)

  return usrWithKeysExcluded
}

export const getUserById = async (id: User['id']) => {
  return prisma.user.findUnique({ where: { id } })
}

export const getOrCreateUser = async (user: UserCreate) => {
  // TODO delete in controller
  // @ts-ignore
  delete user.groups
  const foundUser = await prisma.user.upsert({
    where: { id: user.id },
    update: user,
    create: user,
  })
  return foundUser[0]
}

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
