import type { PluginsUpdateBody } from '@cpn-console/shared'
import { Body, Controller, Get, HttpCode, Inject, Post, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { SystemConfigService } from './system-config.service'

@Controller('api/v1/system/plugins')
export class SystemConfigController {
  constructor(@Inject(SystemConfigService) private readonly service: SystemConfigService) {}

  @Get()
  @UseGuards(UserGuard)
  @RequireAdminPermission('ListSystem')
  async get() {
    return this.service.list()
  }

  @Post()
  @HttpCode(204)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageSystem')
  async update(@Body(new ZodValidationPipe(null as any)) body: PluginsUpdateBody) {
    await this.service.update(body)
  }
}
