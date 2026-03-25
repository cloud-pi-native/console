import type { ListSystemSettingsQueryDto } from './dto/list-system-settings-query.dto'
import type { SystemSettingDto } from './dto/system-setting.dto'
import { Body, Controller, Get, Inject, Param, Put, Query } from '@nestjs/common'
import { SystemSettingsService } from './system-settings.service'

@Controller('api/v1/system/settings')
export class SystemSettingsController {
  constructor(@Inject(SystemSettingsService) private readonly service: SystemSettingsService) {}

  @Get()
  async list(
    @Query() query: ListSystemSettingsQueryDto,
  ) {
    return this.service.list(query.key)
  }

  @Put(':key')
  async upsert(
    @Param('key') key: string,
    @Body() body: SystemSettingDto,
  ) {
    return this.service.upsert(key, body)
  }
}
