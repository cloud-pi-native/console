import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { serviceChainConfigFactory } from '../../config/service-chain.config'
import { PLUGIN_NAME } from './service-chain.constants'

@Injectable()
export class ServiceChainHealthService {
  constructor(
    @Inject(serviceChainConfigFactory.KEY) private readonly opencdsConfig: ConfigType<typeof serviceChainConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    try {
      const headers: Record<string, string> = {}
      headers.Authorization = `Bearer ${this.opencdsConfig.apiToken}`
      const url = new URL('/api/v1/health', this.opencdsConfig.internalUrl ?? this.opencdsConfig.url).toString()
      const response = await fetch(url, { headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
