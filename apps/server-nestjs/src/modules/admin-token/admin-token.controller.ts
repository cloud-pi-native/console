import type { CreateAdminTokenBody } from './admin-token.utils'
import { CoerceBooleanSchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { AdminTokenService } from './admin-token.service'
import { CreateAdminTokenBodySchema } from './admin-token.utils'

@Controller('api/v1/admin/tokens')
@UseGuards(UserGuard)
export class AdminTokenController {
  constructor(@Inject(AdminTokenService) private readonly service: AdminTokenService) {}

  @Get()
  @RequireAdminPermission('ListAdminToken')
  async list(@Query('withRevoked', new ZodValidationPipe(CoerceBooleanSchema)) withRevoked?: boolean) {
    return this.service.list(withRevoked === true)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireAdminPermission('ManageAdminToken')
  async create(
    @Body(new ZodValidationPipe(CreateAdminTokenBodySchema)) data: CreateAdminTokenBody,
  ) {
    return this.service.create(data)
  }

  @Delete(':tokenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermission('ManageAdminToken')
  async revoke(@Param('tokenId', ParseUUIDPipe) tokenId: string): Promise<void> {
    return this.service.revoke(tokenId)
  }
}
