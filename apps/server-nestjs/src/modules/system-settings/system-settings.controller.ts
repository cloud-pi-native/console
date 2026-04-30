import type { SystemSetting } from '@cpn-console/shared'
import { SystemSettingSchema } from '@cpn-console/shared'
import { Body, Controller, Get, Inject, Put, Query } from '@nestjs/common'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe.js'
import { SystemSettingsService } from './system-settings.service'

@Controller('api/v1/system/settings')
export class SystemSettingsController {
  constructor(@Inject(SystemSettingsService) private readonly service: SystemSettingsService) {}

  @Get()
  async list(
    @Query() query: string,
  ) {
    return this.service.list(query)
  }

  @Put(':key')
  async upsert(
    @Body(new ZodValidationPipe(SystemSettingSchema)) data: SystemSetting,
  ) {
    return this.service.upsert(data)
  }
}
