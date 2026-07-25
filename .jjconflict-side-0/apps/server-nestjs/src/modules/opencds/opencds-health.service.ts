import type { OpenCdsConfig } from './opencds.module-definition'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { OPENCDS_CONFIG } from './opencds.module-definition'

@Injectable()
export class OpenCdsHealthService {
  constructor(
    @Inject(OPENCDS_CONFIG) private readonly opencdsConfig: OpenCdsConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
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
