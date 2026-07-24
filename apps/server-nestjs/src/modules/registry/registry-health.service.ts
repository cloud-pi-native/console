import type { HarborAppConfig } from '../../config/harbor'
import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { InjectHarborConfig } from '../../config/harbor'

@Injectable()
export class RegistryHealthService {
  constructor(
    @InjectHarborConfig() private readonly config: HarborAppConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    if (!this.config.internalUrl) return indicator.down('Not configured')

    const url = new URL('/api/v2.0/ping', this.config.internalUrl).toString()
    const headers: Record<string, string> = {}
    if (this.config.admin && this.config.adminPassword) {
      const credentials = `${this.config.admin}:${this.config.adminPassword}`
      const base64 = Buffer.from(credentials).toString('base64')
      headers.Authorization = `Basic ${base64}`
    }

    try {
      const response = await fetch(url, { method: 'GET', headers })
      if (response.status < 500) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
