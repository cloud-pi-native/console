import type { CreatePersonalAccessTokenBody } from '@cpn-console/shared'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { CreatePersonalAccessTokenBodySchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireUserType } from '../infrastructure/permission/user/user-type.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { UserTokensService } from './user-tokens.service'
import { toExposedPersonalAccessToken, toPersonalAccessToken } from './user-tokens.utils'

@Controller('api/v1/user/tokens')
@UseGuards(UserGuard)
@RequireUserType('human')
export class UserTokensController {
  constructor(@Inject(UserTokensService) private readonly service: UserTokensService) {}

  @Get()
  async list(@AuthUser() user: UserContext) {
    const tokens = await this.service.list(user.userId)
    return tokens.map(toPersonalAccessToken)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreatePersonalAccessTokenBodySchema)) data: CreatePersonalAccessTokenBody,
    @AuthUser() user: UserContext,
  ) {
    const { token, password } = await this.service.create(data, user.userId)
    return toExposedPersonalAccessToken(token, password)
  }

  @Delete(':tokenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @AuthUser() user: UserContext,
  ): Promise<void> {
    return this.service.delete(tokenId, user.userId)
  }
}
