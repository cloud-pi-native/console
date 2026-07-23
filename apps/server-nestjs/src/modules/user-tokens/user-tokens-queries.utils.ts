import type { Prisma } from '@prisma/client'

export const userTokenOwnerSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  type: true,
} satisfies Prisma.UserSelect

export const userTokenSelect = {
  id: true,
  name: true,
  lastUse: true,
  expirationDate: true,
  status: true,
  createdAt: true,
  userId: true,
  owner: {
    select: userTokenOwnerSelect,
  },
} satisfies Prisma.PersonalAccessTokenSelect

export type UserTokenRecord = Prisma.PersonalAccessTokenGetPayload<{
  select: typeof userTokenSelect
}>

export function listUserTokens(tx: Prisma.TransactionClient, userId: string) {
  return tx.personalAccessToken.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    select: userTokenSelect,
  })
}

export function createUserToken(tx: Prisma.TransactionClient, data: {
  name: string
  expirationDate: Date
  hash: string
  userId: string
}) {
  return tx.personalAccessToken.create({
    data: {
      name: data.name,
      hash: data.hash,
      expirationDate: data.expirationDate,
      userId: data.userId,
    },
    select: userTokenSelect,
  })
}
