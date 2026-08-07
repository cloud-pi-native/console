import type { Prisma } from '@prisma/client'

export const adminTokenOwnerSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  type: true,
} satisfies Prisma.UserSelect

export const adminTokenSelect = {
  id: true,
  name: true,
  permissions: true,
  lastUse: true,
  expirationDate: true,
  status: true,
  createdAt: true,
  userId: true,
  owner: {
    select: adminTokenOwnerSelect,
  },
} satisfies Prisma.AdminTokenSelect

export type AdminTokenRecord = Prisma.AdminTokenGetPayload<{
  select: typeof adminTokenSelect
}>

export function listAdminTokens(tx: Prisma.TransactionClient, withRevoked: boolean) {
  const where: Prisma.AdminTokenWhereInput = withRevoked
    ? { status: { in: ['active', 'revoked'] } }
    : { status: 'active' }

  return tx.adminToken.findMany({
    where,
    select: adminTokenSelect,
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  })
}

export function createBotUser(tx: Prisma.TransactionClient, data: { botUserId: string, name: string }) {
  return tx.user.create({
    data: {
      firstName: 'Bot Admin',
      lastName: data.name,
      type: 'bot',
      id: data.botUserId,
      email: `${data.botUserId}@bot.io`,
    },
  })
}

export function createAdminToken(tx: Prisma.TransactionClient, data: {
  name: string
  permissions: bigint
  expirationDate: Date | null
  hash: string
  userId: string
}) {
  return tx.adminToken.create({
    data: {
      name: data.name,
      permissions: data.permissions,
      expirationDate: data.expirationDate,
      hash: data.hash,
      userId: data.userId,
    },
    select: adminTokenSelect,
  })
}

export function revokeAdminToken(tx: Prisma.TransactionClient, id: string) {
  return tx.adminToken.updateMany({
    where: { id },
    data: {
      status: 'revoked',
      expirationDate: new Date(),
    },
  })
}
