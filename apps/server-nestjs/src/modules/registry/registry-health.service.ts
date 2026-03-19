import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'

@Injectable()
export class RegistryHealthService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(HealthIndicatorService) private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicatorService.check(key)
    if (!this.config.harborInternalUrl) return indicator.down('Not configured')

    const url = new URL('/api/v2.0/ping', this.config.harborInternalUrl).toString()
    const headers: Record<string, string> = {}
    if (this.config.harborAdmin && this.config.harborAdminPassword) {
      headers.Authorization = `Basic ${Buffer.from(`${this.config.harborAdmin}:${this.config.harborAdminPassword}`).toString('base64')}`
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
