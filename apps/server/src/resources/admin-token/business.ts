import type { $Enums, AdminToken, Prisma } from '@cpn-console/database'
import type { adminTokenContract } from '@cpn-console/shared'
import { createHash, randomUUID } from 'node:crypto'
import { logger as baseLogger } from '@cpn-console/logger'
import { generateRandomPassword, isAtLeastTomorrow } from '@cpn-console/shared'
import { BadRequest400 } from '@/utils/errors.js'
import prisma from '../../prisma.js'

const logger = baseLogger.child({ scope: 'resource:admin-token' })

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
  logger.info({ tokenName: data.name, expirationDate: data.expirationDate ?? null }, 'Create admin token started')
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
  logger.info({ adminTokenId: token.id, botUserId, expirationDate: token.expirationDate ?? null, status: token.status }, 'Create admin token completed')
  return {
    ...token,
    password,
    permissions: token.permissions.toString(),
  }
}

export async function deleteToken(id: AdminToken['id']) {
  logger.info({ adminTokenId: id }, 'Revoke admin token started')
  return prisma.adminToken.updateMany({
    where: { id },
    data: {
      status: 'revoked',
      expirationDate: new Date(Date.now()),
    },
  })
}
