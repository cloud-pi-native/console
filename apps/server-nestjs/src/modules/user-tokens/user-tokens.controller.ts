import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { PersonalAccessTokenSchema } from '@cpn-console/shared'
import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { UserTokensService } from './user-tokens.service'

@Controller('api/v1/user/tokens')
@UseGuards(UserGuard)
export class UserTokensController {
  constructor(@Inject(UserTokensService) private readonly service: UserTokensService) {}

  @Get()
  async list(@AuthUser() user: UserContext) {
    if (!user.userId || user.userType !== 'human') {
      throw new ForbiddenException('Seuls les utilisateurs humains peuvent gérer des tokens personnels')
    }
    return this.service.list(user.userId)
  }

  @Post()
  @HttpCode(201)
  async create(
    @Body(new ZodValidationPipe(PersonalAccessTokenSchema.pick({ name: true, expirationDate: true }).required())) data: { name: string, expirationDate: string },
    @AuthUser() user: UserContext,
  ) {
    if (!user.userId || user.userType !== 'human') {
      throw new ForbiddenException('Seuls les utilisateurs humains peuvent gérer des tokens personnels')
    }
    return this.service.create(data, user.userId)
  }

  @Delete(':tokenId')
  @HttpCode(204)
  async delete(
    @Param('tokenId') tokenId: string,
    @AuthUser() user: UserContext,
  ): Promise<void> {
    if (!user.userId || user.userType !== 'human') {
      throw new ForbiddenException('Seuls les utilisateurs humains peuvent gérer des tokens personnels')
    }
    return this.service.delete(tokenId, user.userId)
  }
}
