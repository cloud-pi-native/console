import { Controller, Get, Inject } from '@nestjs/common'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'

@Controller('api/v1/version')
export class VersionController {
  constructor(
    @Inject(ConfigurationService)
    private readonly config: ConfigurationService,
  ) {}

  @Get()
  getVersion() {
    return { version: this.config.appVersion }
  }
}
