import type { HarborConfig } from '../../config/harbor.config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { harborConfigFactory } from '../../config/harbor.config'
import { PLUGIN_NAME } from './registry.constants'

@Injectable()
export class RegistryHealthService {
  constructor(
    @Inject(harborConfigFactory.KEY) private readonly harborConfig: HarborConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    const headers: Record<string, string> = {}
    const credentials = `${this.harborConfig.admin}:${this.harborConfig.adminPassword}`
    const base64 = Buffer.from(credentials).toString('base64')
    headers.Authorization = `Basic ${base64}`
    try {
      const url = new URL('/api/v2.0/ping', this.harborConfig.internalUrl ?? this.harborConfig.url).toString()
      const response = await fetch(url, { method: 'GET', headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
