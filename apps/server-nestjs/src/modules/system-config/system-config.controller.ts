import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/auth/admin/admin-permission.decorator'
import { AdminGuard } from '../infrastructure/auth/admin/admin.guard'
import { SystemConfigService } from './system-config.service'

@Controller('api/v1/system/plugins')
export class SystemConfigController {
  constructor(@Inject(SystemConfigService) private readonly service: SystemConfigService) {}

  @Get()
  @UseGuards(AdminGuard)
  @RequireAdminPermission('ListSystem')
  async getPluginsConfig() {
    return this.service.listPluginsConfig()
  }

  @Post()
  @UseGuards(AdminGuard)
  @RequireAdminPermission('ManageSystem')
  async updatePluginsConfig(@Body() body: Record<string, Record<string, string>>) {
    await this.service.updatePluginsConfig(body)
    return {}
  }
}
