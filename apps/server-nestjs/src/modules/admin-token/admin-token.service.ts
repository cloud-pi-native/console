import type { Prisma } from '@prisma/client'
import { randomBytes, randomUUID, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { generateRandomPassword, isAtLeastTomorrow } from '@cpn-console/shared'
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'

const scryptAsync = promisify(scrypt)

@Injectable()
export class AdminTokenService {
  private readonly logger = new Logger(AdminTokenService.name)

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @StartActiveSpan()
  async list(withRevoked?: boolean) {
    const span = trace.getActiveSpan()
    this.logger.log(`adminToken.list requested (withRevoked=${withRevoked ?? false})`)
    span?.setAttribute('adminToken.list.withRevoked', withRevoked ?? false)

    const where: Prisma.AdminTokenWhereInput = withRevoked
      ? { status: { in: ['active', 'revoked'] } }
      : { status: 'active' }

    const tokens = await this.prisma.adminToken.findMany({
      omit: { hash: true },
      include: { owner: true },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      where,
    })

    span?.setAttribute('adminToken.list.count', tokens.length)
    this.logger.log(`adminToken.list completed (count=${tokens.length})`)

    return tokens.map(({ permissions, ...token }) => ({
      ...token,
      permissions: permissions.toString(),
    }))
  }

  @StartActiveSpan()
  async create(data: { name: string, permissions: string, expirationDate?: string | null }) {
    const span = trace.getActiveSpan()
    span?.setAttribute('adminToken.create.name', data.name)
    this.logger.log(`adminToken.create started (tokenName=${data.name})`)

    if (data.expirationDate && !isAtLeastTomorrow(new Date(data.expirationDate))) {
      this.logger.warn(`adminToken.create rejected (tokenName=${data.name}, reason=expirationTooSoon)`)
      throw new BadRequestException('Date d\'expiration trop courte')
    }

    try {
      const password = generateRandomPassword(48, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-')
      const salt = randomBytes(16).toString('hex')
      const derivedKey = await scryptAsync(password, salt, 64) as Buffer
      const hash = `scrypt$${salt}$${derivedKey.toString('hex')}`
      const botUserId = randomUUID()

      await this.prisma.user.create({
        data: {
          firstName: 'Bot Admin',
          lastName: data.name,
          type: 'bot',
          id: botUserId,
          email: `${botUserId}@bot.io`,
        },
      })

      const token = await this.prisma.adminToken.create({
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

      span?.setAttribute('adminToken.create.tokenId', token.id)
      this.logger.log(`adminToken.create completed (adminTokenId=${token.id}, botUserId=${botUserId}, status=${token.status})`)

      return {
        ...token,
        password,
        permissions: token.permissions.toString(),
      }
    } catch (error) {
      this.logger.error(
        `adminToken.create failed (tokenName=${data.name}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  @StartActiveSpan()
  async revoke(id: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('adminToken.revoke.tokenId', id)
    this.logger.log(`adminToken.revoke started (adminTokenId=${id})`)

    await this.prisma.adminToken.updateMany({
      where: { id },
      data: {
        status: 'revoked',
        expirationDate: new Date(),
      },
    })

    this.logger.log(`adminToken.revoke completed (adminTokenId=${id})`)
  }
}
