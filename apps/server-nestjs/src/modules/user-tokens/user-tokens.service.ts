import { isAtLeastTomorrow } from '@cpn-console/shared'
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import z from 'zod'
import { generateTokenPair } from '../../utils/crypto'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { createUserToken, listUserTokens } from './user-tokens-queries.utils'

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
  async create(data: { name: string, expirationDate: string }, userId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('userTokens.create.name', data.name)
    span?.setAttribute('userTokens.create.userId', userId)
    this.logger.log(`userTokens.create started (tokenName=${data.name}, userId=${userId})`)

    const expirationDate = z.coerce.date().parse(data.expirationDate)

    if (!isAtLeastTomorrow(expirationDate)) {
      this.logger.warn(`userTokens.create rejected (tokenName=${data.name}, userId=${userId}, reason=expirationTooSoon)`)
      throw new BadRequestException('Date d\'expiration trop courte')
    }

    try {
      const { password, hash } = await generateTokenPair()

      const token = await createUserToken(this.prisma, {
        ...data,
        hash,
        userId,
        expirationDate,
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

    const { count } = await this.prisma.personalAccessToken.deleteMany({
      where: { id: tokenId, userId },
    })

    if (count > 0) {
      this.logger.log(`userTokens.delete completed (tokenId=${tokenId})`)
    } else {
      this.logger.log(`userTokens.delete skipped (tokenId=${tokenId}, reason=notFoundOrNotOwner)`)
    }
  }
}
