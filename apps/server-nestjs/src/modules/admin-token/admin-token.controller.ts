import { AdminTokenSchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Query, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { AdminTokenService } from './admin-token.service'

@Controller('api/v1/admin/tokens')
@UseGuards(UserGuard)
export class AdminTokenController {
  constructor(@Inject(AdminTokenService) private readonly service: AdminTokenService) {}

  @Get()
  @RequireAdminPermission('ListAdminToken')
  async list(@Query('withRevoked') withRevoked?: string) {
    return this.service.list(withRevoked === 'true')
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireAdminPermission('ManageAdminToken')
  async create(
    @Body(new ZodValidationPipe(AdminTokenSchema.pick({ name: true, permissions: true, expirationDate: true }).required())) data: { name: string, permissions: string, expirationDate: string | null },
  ) {
    return this.service.create(data)
  }

  @Delete(':tokenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermission('ManageAdminToken')
  async revoke(@Param('tokenId') tokenId: string): Promise<void> {
    return this.service.revoke(tokenId)
  }
}
