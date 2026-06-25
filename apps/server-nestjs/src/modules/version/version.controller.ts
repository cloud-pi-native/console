import type { BaseConfig } from '../../config/base'
import { Controller, Get, Inject } from '@nestjs/common'
import { baseConfigFactory } from '../../config/base'

@Controller('api/v1/version')
export class VersionController {
  constructor(
    @Inject(baseConfigFactory.KEY) private readonly config: BaseConfig,
  ) {}

  @Get()
  getVersion() {
    return { version: this.config.appVersion }
  }
}
