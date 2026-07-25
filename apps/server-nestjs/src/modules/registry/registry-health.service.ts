import type { HarborConfig } from './harbor.module-definition'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { HARBOR_CONFIG } from './harbor.module-definition'

@Injectable()
export class RegistryHealthService {
  constructor(
    @Inject(HARBOR_CONFIG) private readonly harborConfig: HarborConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    if (!this.harborConfig.internalUrl) return indicator.down('Not configured')

    const url = new URL('/api/v2.0/ping', this.harborConfig.internalUrl).toString()
    const headers: Record<string, string> = {}
    if (this.harborConfig.admin && this.harborConfig.adminPassword) {
      const credentials = `${this.harborConfig.admin}:${this.harborConfig.adminPassword}`
      const base64 = Buffer.from(credentials).toString('base64')
      headers.Authorization = `Basic ${base64}`
    }

    try {
      const response = await fetch(url, { method: 'GET', headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
