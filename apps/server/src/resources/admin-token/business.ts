import type { $Enums, AdminToken, Prisma } from '@prisma/client'
import { createHash } from 'node:crypto'
import { BadRequest400 } from '@/utils/errors.js'
import { type adminTokenContract, generateRandomPassword, isAtLeastTomorrow } from '@cpn-console/shared'
import prisma from '../../prisma.js'

export async function listTokens(query: typeof adminTokenContract.listAdminTokens.query._type) {
  const where = {
    status: {
      in: ['active'] as $Enums.TokenStatus[],
    },
  } as const satisfies Prisma.AdminTokenWhereInput

  if (query?.withRevoked) where.status.in.push('revoked')

  return prisma.adminToken.findMany({
    omit: { hash: true },
    include: { createdBy: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    where,
  }).then(tokens =>
    tokens.map(({ permissions, ...token }) => ({ permissions: permissions.toString(), ...token })),
  )
}

export async function createToken(data: typeof adminTokenContract.createAdminToken.body._type, userId: string | null | undefined, tokenId: string | undefined) {
  if (!userId) {
    const originalToken = await prisma.adminToken.findUniqueOrThrow({ where: { id: tokenId } })
    userId = originalToken.userId
  }
  if (data.expirationDate && !isAtLeastTomorrow(new Date(data.expirationDate))) {
    return new BadRequest400('Date d\'expiration trop courte')
  }
  const password = generateRandomPassword(48, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-')
  const hash = createHash('sha256').update(password).digest('hex')
  const token = await prisma.adminToken.create({
    data: {
      ...data,
      hash,
      permissions: BigInt(data.permissions),
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      userId,
    },
    omit: { hash: true },
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
