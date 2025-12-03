import { createHash } from 'node:crypto'
import type { personalAccessTokenContract } from '@cpn-console/shared'
import { generateRandomPassword, isAtLeastTomorrow } from '@cpn-console/shared'
import type { AdminToken, User } from '@prisma/client'
import prisma from '../../../prisma.js'
import { BadRequest400 } from '@/utils/errors.js'

export async function listTokens(userId: User['id']) {
  return prisma.personalAccessToken.findMany({
    omit: { hash: true },
    include: { owner: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    where: { userId },
  })
}

export async function createToken(data: typeof personalAccessTokenContract.createPersonalAccessToken.body._type, userId: User['id']) {
  if (data.expirationDate && !isAtLeastTomorrow(new Date(data.expirationDate))) {
    return new BadRequest400('Date d\'expiration trop courte')
  }
  const password = generateRandomPassword(48, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-')
  const hash = createHash('sha256').update(password).digest('hex')
  const token = await prisma.personalAccessToken.create({
    data: {
      ...data,
      hash,
      expirationDate: new Date(data.expirationDate),
      userId,
    },
    omit: { hash: true },
    include: { owner: true },
  })
  return {
    ...token,
    password,
  }
}

export async function deleteToken(id: AdminToken['id'], userId: User['id']) {
  const token = await prisma.personalAccessToken.findUnique({
    where: {
      id,
      userId,
    },
  })
  if (token) {
    return prisma.personalAccessToken.delete({
      where: { id },
    })
  }
}
