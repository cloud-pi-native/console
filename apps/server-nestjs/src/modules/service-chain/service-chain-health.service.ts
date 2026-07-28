import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { serviceChainConfigFactory } from '../../config/service-chain.config'

@Injectable()
export class ServiceChainHealthService {
  constructor(
    @Inject(serviceChainConfigFactory.KEY) private readonly opencdsConfig: ConfigType<typeof serviceChainConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    if (!this.opencdsConfig.probeUrl) {
      return indicator.down('Service chain (OpenCDS) is not configured')
    }
    try {
      const headers: Record<string, string> = {}
      headers.Authorization = `Bearer ${this.opencdsConfig.apiToken}`
      const response = await fetch(this.opencdsConfig.probeUrl, { headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
