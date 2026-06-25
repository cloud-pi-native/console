import type { ConfigType } from '@nestjs/config'
import { Controller, Get, Inject } from '@nestjs/common'
import { baseConfigFactory } from '../../config/base.config'

@Controller('api/v1/version')
export class VersionController {
  constructor(
    @Inject(baseConfigFactory.KEY) private readonly baseConfig: ConfigType<typeof baseConfigFactory>,
  ) {}

  @Get()
  getVersion() {
    return { version: this.baseConfig.appVersion }
  }
}
