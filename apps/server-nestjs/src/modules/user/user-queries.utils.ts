import type { Prisma, User } from '@prisma/client'
import { PrismaService } from '../infrastructure/database/prisma.service'

type UserCreate = Omit<User, 'createdAt' | 'updatedAt'>

// ── selects ───────────────────────────────────────────────────────────────────────────
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

export const userAdminRoleIdsSelect = {
  id: true,
  adminRoleIds: true,
} satisfies Prisma.UserSelect
export type UserAdminRoleIdsRecord = Prisma.UserGetPayload<{ select: typeof userAdminRoleIdsSelect }>

// ── queries ───────────────────────────────────────────────────────────────────────────
export function getUsers(prisma: PrismaService, where?: Prisma.UserWhereInput) {
  return prisma.user.findMany({ where })
}

export function getUserInfos(prisma: PrismaService, id: User['id']) {
  return prisma.user.findMany({
    where: { id },
    include: {
      logs: true,
    },
  })
}

export function getMatchingUsers(prisma: PrismaService, where: Prisma.UserWhereInput) {
  return prisma.user.findMany({
    where,
    take: 5,
  })
}

export function getUserById(prisma: PrismaService, id: User['id']) {
  return prisma.user.findUnique({ where: { id } })
}

export function getUserOrThrow(prisma: PrismaService, id: User['id']) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
  })
}

export function getUserByEmail(prisma: PrismaService, email: User['email']) {
  return prisma.user.findUnique({ where: { email } })
}

export function getAdminRolesByName(prisma: PrismaService, names: string[]) {
  return prisma.adminRole.findMany({ where: { name: { in: names } } })
}

export function getUsersByIds(prisma: PrismaService, ids: User['id'][]) {
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: userAdminRoleIdsSelect,
  })
}

export function updateUserAdminRoleIds(prisma: PrismaService, id: User['id'], adminRoleIds: string[]) {
  return prisma.user.update({
    where: { id },
    data: { adminRoleIds },
  })
}

// ── create ─────────────────────────────────────────────────────────────────────────────
export async function createUser(prisma: PrismaService, { id, email, firstName, lastName, type }: UserCreate) {
  const user = await getUserByEmail(prisma, email)
  if (user) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  return prisma.user.create({ data: { id, email, firstName, lastName, type } })
}

// ── update ─────────────────────────────────────────────────────────────────────────────
export async function updateUserById(prisma: PrismaService, { id, email, firstName, lastName }: UserCreate) {
  const user = await getUserById(prisma, id)
  const isEmailAlreadyTaken = await getUserByEmail(prisma, email)
  if (!user) throw new Error('L\'utilisateur demandé n\'existe pas')
  if (isEmailAlreadyTaken) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  return prisma.user.update({ where: { id }, data: { email, firstName, lastName } })
}

// ── tech ───────────────────────────────────────────────────────────────────────────────
export function _createUser(prisma: PrismaService, data: Prisma.UserCreateInput) {
  return prisma.user.upsert({ where: { id: data.id }, create: data, update: data })
}
