import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'

@Injectable()
export class NexusHealthService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    if (!this.config.nexusInternalUrl) return indicator.down('Not configured')

    const url = new URL('/service/rest/v1/status', this.config.nexusInternalUrl).toString()
    const headers: Record<string, string> = {}
    if (this.config.nexusAdmin && this.config.nexusAdminPassword) {
      headers.Authorization = `Basic ${Buffer.from(`${this.config.nexusAdmin}:${this.config.nexusAdminPassword}`).toString('base64')}`
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
