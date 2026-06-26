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

export function listUserTokens(db: Prisma.TransactionClient, userId: string) {
  return db.personalAccessToken.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    select: userTokenSelect,
  })
}

export function createUserToken(db: Prisma.TransactionClient, data: {
  name: string
  expirationDate: string
  hash: string
  userId: string
}) {
  return db.personalAccessToken.create({
    data: {
      name: data.name,
      hash: data.hash,
      expirationDate: new Date(data.expirationDate),
      userId: data.userId,
    },
    select: userTokenSelect,
  })
}

export function getOwnedUserToken(db: Prisma.TransactionClient, tokenId: string, userId: string) {
  return db.personalAccessToken.findUnique({
    where: {
      id: tokenId,
      userId,
    },
  })
}
