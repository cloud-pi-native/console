import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { PLUGIN_NAME } from './service-chain.constants'

@Injectable()
export class ServiceChainHealthService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    if (!this.config.openCdsUrl) return indicator.down('Not configured')

    try {
      const url = new URL('/api/v1/health', this.config.openCdsUrl).toString()
      const headers: Record<string, string> = {}
      if (this.config.openCdsApiToken) {
        headers.Authorization = `Bearer ${this.config.openCdsApiToken}`
      }

      const response = await fetch(url, { headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
