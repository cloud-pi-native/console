import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { PLUGIN_NAME } from '../vault/vault.constants'

@Injectable()
export class GitlabHealthService {
  constructor(
    @Inject(gitlabConfigFactory.KEY) private readonly gitlabConfig: ConfigType<typeof gitlabConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    try {
      const url = new URL('/-/health', this.gitlabConfig.internalUrl ?? this.gitlabConfig.url).toString()
      const response = await fetch(url)
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
