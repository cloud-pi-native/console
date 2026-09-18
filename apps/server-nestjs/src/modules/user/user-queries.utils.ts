import type { Prisma, User } from '@prisma/client'
import type { PrismaService } from '../infrastructure/database/prisma.service'

type UserCreate = Omit<User, 'createdAt' | 'updatedAt'>

export const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  adminRoleIds: true,
  type: true,
} satisfies Prisma.UserSelect
export type UserRecord = Prisma.UserGetPayload<{ select: typeof userSelect }>

export function getUsers(prisma: PrismaService, where?: Prisma.UserWhereInput) {
  return prisma.user.findMany({ where })
}

export function getMatchingUsers(prisma: PrismaService, where: Prisma.UserWhereInput) {
  return prisma.user.findMany({
    where,
    take: 5,
  })
}

export function getUserByEmail(prisma: PrismaService, email: User['email']) {
  return prisma.user.findUnique({ where: { email } })
}

export function getAdminRolesByName(prisma: PrismaService, names: string[]) {
  return prisma.adminRole.findMany({ where: { name: { in: names } } })
}

export function updateUserAdminRoleIds(prisma: PrismaService, id: User['id'], adminRoleIds: string[]) {
  return prisma.user.update({
    where: { id },
    data: { adminRoleIds },
  })
}

export async function createUser(prisma: PrismaService, { id, email, firstName, lastName, type }: UserCreate) {
  const user = await getUserByEmail(prisma, email)
  if (user) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  return prisma.user.create({ data: { id, email, firstName, lastName, type } })
}
