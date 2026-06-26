import type { CreateAdminTokenBody } from './admin-token.utils'
import { randomUUID } from 'node:crypto'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { generateTokenPair } from '../../utils/crypto.utils'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import {
  createAdminToken,
  createBotUser,
  listAdminTokens,
  revokeAdminToken,
} from './admin-token-queries.utils'

@Injectable()
export class AdminTokenService {
  private readonly logger = new Logger(AdminTokenService.name)

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @StartActiveSpan()
  async list(withRevoked = false) {
    const span = trace.getActiveSpan()
    this.logger.log(`adminToken.list requested (withRevoked=${withRevoked})`)
    span?.setAttribute('adminToken.list.withRevoked', withRevoked)

    const tokens = await listAdminTokens(this.prisma, withRevoked)

    span?.setAttribute('adminToken.list.count', tokens.length)
    this.logger.log(`adminToken.list completed (count=${tokens.length})`)
    return tokens.map(({ permissions, ...token }) => ({
      ...token,
      permissions: permissions.toString(),
    }))
  }

  @StartActiveSpan()
  async create(data: CreateAdminTokenBody) {
    const span = trace.getActiveSpan()
    span?.setAttribute('adminToken.create.name', data.name)
    this.logger.log(`adminToken.create started (tokenName=${data.name})`)

    const expirationDate = data.expirationDate

    try {
      const { password, hash } = generateTokenPair()

      const token = await this.prisma.$transaction(async (tx) => {
        const botUserId = randomUUID()
        await createBotUser(tx, { botUserId, name: data.name })
        return createAdminToken(tx, {
          name: data.name,
          permissions: BigInt(data.permissions),
          expirationDate,
          hash,
          userId: botUserId,
        })
      })

      span?.setAttribute('adminToken.create.tokenId', token.id)
      this.logger.log(`adminToken.create completed (adminTokenId=${token.id}, botUserId=${token.userId}, status=${token.status})`)
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

    await revokeAdminToken(this.prisma, id)

    this.logger.log(`adminToken.revoke completed (adminTokenId=${id})`)
  }
}
