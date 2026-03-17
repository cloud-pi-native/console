import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

@Injectable()
export class GitlabHealthService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(HealthIndicatorService) private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicatorService.check(key)
    if (!this.config.gitlabInternalUrl) return indicator.down('Not configured')

    const url = new URL('/-/health', this.config.gitlabInternalUrl).toString()
    try {
      const response = await fetch(url, { method: 'GET' })
      if (response.status < 500) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
