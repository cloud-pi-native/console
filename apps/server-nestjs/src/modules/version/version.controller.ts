import type { BaseConfig } from '../infrastructure/config/base.config'
import { Controller, Get, Inject } from '@nestjs/common'
import { BASE_CONFIG } from '../infrastructure/config/base.config'

@Controller('api/v1/version')
export class VersionController {
  constructor(
    @Inject(BASE_CONFIG) private readonly baseConfig: BaseConfig,
  ) {}

  @Get()
  getVersion() {
    return { version: this.baseConfig.appVersion }
  }
}
