import type { ListSystemSettingsQueryDto } from './dto/list-system-settings-query.dto'
import { Body, Controller, Get, Inject, Put, Query, UseGuards, ValidationPipe } from '@nestjs/common'
import { AbilityGuard } from '../../cpin-module/infrastructure/iam/guards/ability.guard'
import { SystemSettingDto } from './dto/system-setting.dto'
import { SystemSettingsService } from './system-settings.service'

@Controller('api/v1/system/settings')
export class SystemSettingsController {
  constructor(@Inject(SystemSettingsService) private readonly service: SystemSettingsService) {}

  @Get()
  async list(@Query() query: ListSystemSettingsQueryDto) {
    return this.service.list(query.key)
  }

  @Put()
  @UseGuards(new AbilityGuard('manage', 'SystemSetting'))
  async upsert(
    @Body(new ValidationPipe({ transform: true, whitelist: true, expectedType: SystemSettingDto }))
    body: SystemSettingDto,
  ) {
    return this.service.upsert(body)
  }
}
