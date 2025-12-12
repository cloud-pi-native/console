import { createHash, randomUUID } from 'node:crypto'
import { type adminTokenContract, generateRandomPassword, isAtLeastTomorrow } from '@cpn-console/shared'
import type { $Enums, AdminToken, Prisma } from '@prisma/client'
import prisma from '../../prisma'
import { BadRequest400 } from '@old-server/utils/errors'

export async function listTokens(query: typeof adminTokenContract.listAdminTokens.query._type) {
  const where = {
    status: {
      in: ['active'] as $Enums.TokenStatus[],
    },
  } as const satisfies Prisma.AdminTokenWhereInput

  if (query?.withRevoked) where.status.in.push('revoked')

  return prisma.adminToken.findMany({
    omit: { hash: true },
    include: { owner: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    where,
  }).then(tokens =>
    tokens.map(({ permissions, ...token }) => ({ permissions: permissions.toString(), ...token })),
  )
}

export async function createToken(data: typeof adminTokenContract.createAdminToken.body._type) {
  if (data.expirationDate && !isAtLeastTomorrow(new Date(data.expirationDate))) {
    return new BadRequest400('Date d\'expiration trop courte')
  }
  const password = generateRandomPassword(48, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-')
  const hash = createHash('sha256').update(password).digest('hex')
  const botUserId = randomUUID()
  await prisma.user.create({
    data: {
      firstName: 'Bot Admin',
      lastName: data.name,
      type: 'bot',
      id: botUserId,
      email: `${botUserId}@bot.io`,
    },
  })
  const token = await prisma.adminToken.create({
    data: {
      ...data,
      hash,
      permissions: BigInt(data.permissions),
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      userId: botUserId,
    },
    omit: { hash: true },
    include: { owner: true },
  })
  return {
    ...token,
    password,
    permissions: token.permissions.toString(),
  }
}

export async function deleteToken(id: AdminToken['id']) {
  return prisma.adminToken.updateMany({
    where: { id },
    data: {
      status: 'revoked',
      expirationDate: new Date(Date.now()),
    },
  })
}
