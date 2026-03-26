import type { ListSystemSettingsQueryDto } from './dto/list-system-settings-query.dto'
import type { SystemSettingDto } from './dto/system-setting.dto'
import { Body, Controller, Get, Inject, Param, Put, Query, UseGuards } from '@nestjs/common'
import { AbilityGuard } from '../../cpin-module/infrastructure/iam/guards/ability.guard'
import { AuthGuard } from '../../cpin-module/infrastructure/iam/guards/auth.guard'
import { RoleGuard } from '../../cpin-module/infrastructure/iam/guards/role.guard'
import { SystemSettingsService } from './system-settings.service'

@Controller('api/v1/system/settings')
export class SystemSettingsController {
  constructor(@Inject(SystemSettingsService) private readonly service: SystemSettingsService) {}

  @Get()
  @UseGuards(AuthGuard, RoleGuard, new AbilityGuard('read', 'SystemSetting'))
  async list(
    @Query() query: ListSystemSettingsQueryDto,
  ) {
    return this.service.list(query.key)
  }

  @Put(':key')
  @UseGuards(AuthGuard, RoleGuard, new AbilityGuard('manage', 'SystemSetting'))
  async upsert(
    @Param('key') key: string,
    @Body() body: SystemSettingDto,
  ) {
    return this.service.upsert(key, body)
  }
}
