import type { HarborConfig } from '../../config/harbor.config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { harborConfigFactory } from '../../config/harbor.config'

@Injectable()
export class RegistryHealthService {
  constructor(
    @Inject(harborConfigFactory.KEY) private readonly harborConfig: HarborConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    if (!this.harborConfig.probeUrl) {
      return indicator.down('Harbor is not configured')
    }
    const headers: Record<string, string> = {}
    const credentials = `${this.harborConfig.admin}:${this.harborConfig.adminPassword}`
    const base64 = Buffer.from(credentials).toString('base64')
    headers.Authorization = `Basic ${base64}`
    try {
      const response = await fetch(this.harborConfig.probeUrl, { method: 'GET', headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
