import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { opencdsConfigFactory } from '../../config/opencds.config'

@Injectable()
export class OpenCdsHealthService {
  constructor(
    @Inject(opencdsConfigFactory.KEY) private readonly opencdsConfig: ConfigType<typeof opencdsConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    if (!this.opencdsConfig.probeUrl) return indicator.down('Not configured')

    try {
      const headers: Record<string, string> = {}
      if (this.opencdsConfig.apiToken) {
        headers.Authorization = `Bearer ${this.opencdsConfig.apiToken}`
      }

      const response = await fetch(this.opencdsConfig.probeUrl, { headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
