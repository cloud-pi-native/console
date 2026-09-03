import type { CreatePersonalAccessTokenBody } from './user-tokens.utils'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { generateTokenPair } from '../../utils/crypto.utils'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { createUserToken, deleteUserToken, listUserTokens } from './user-tokens-queries.utils'

@Injectable()
export class UserTokensService {
  private readonly logger = new Logger(UserTokensService.name)

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @StartActiveSpan()
  async list(userId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('userTokens.list.userId', userId)
    this.logger.log(`userTokens.list requested (userId=${userId})`)

    const tokens = await listUserTokens(this.prisma, userId)

    span?.setAttribute('userTokens.list.count', tokens.length)
    this.logger.log(`userTokens.list completed (userId=${userId}, count=${tokens.length})`)
    return tokens
  }

  @StartActiveSpan()
  async create(data: CreatePersonalAccessTokenBody, userId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('userTokens.create.name', data.name)
    span?.setAttribute('userTokens.create.userId', userId)
    this.logger.log(`userTokens.create started (tokenName=${data.name}, userId=${userId})`)

    try {
      const { password, hash } = generateTokenPair()

      const token = await createUserToken(this.prisma, {
        ...data,
        hash,
        userId,
      })

      span?.setAttribute('userTokens.create.tokenId', token.id)
      this.logger.log(`userTokens.create completed (tokenId=${token.id}, userId=${userId})`)
      return {
        ...token,
        password,
      }
    } catch (error) {
      this.logger.error(
        `userTokens.create failed (tokenName=${data.name}, userId=${userId}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  @StartActiveSpan()
  async delete(tokenId: string, userId: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('userTokens.delete.tokenId', tokenId)
    span?.setAttribute('userTokens.delete.userId', userId)
    this.logger.log(`userTokens.delete started (tokenId=${tokenId}, userId=${userId})`)

    const { count } = await deleteUserToken(this.prisma, { id: tokenId, userId })

    if (count > 0) {
      this.logger.log(`userTokens.delete completed (tokenId=${tokenId})`)
    } else {
      this.logger.log(`userTokens.delete skipped (tokenId=${tokenId}, reason=notFoundOrNotOwner)`)
    }
  }
}
