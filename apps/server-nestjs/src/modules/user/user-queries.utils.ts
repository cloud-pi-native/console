import type { Prisma, User } from '@prisma/client'

export function getUsers(client: Prisma.TransactionClient, where?: Prisma.UserWhereInput) {
  return client.user.findMany({ where })
}

export function getMatchingUsers(client: Prisma.TransactionClient, where: Prisma.UserWhereInput) {
  return client.user.findMany({
    where,
    take: 5,
  })
}

export function getUserByEmail(client: Prisma.TransactionClient, email: User['email']) {
  return client.user.findUnique({ where: { email } })
}

export function getAdminRolesByName(client: Prisma.TransactionClient, names: string[]) {
  return client.adminRole.findMany({ where: { name: { in: names } } })
}

export function updateUserAdminRoleIds(client: Prisma.TransactionClient, id: User['id'], adminRoleIds: string[]) {
  return client.user.update({
    where: { id },
    data: { adminRoleIds },
  })
}

export function createUser(client: Prisma.TransactionClient, data: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'type'>) {
  return client.user.create({ data })
}
