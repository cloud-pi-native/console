import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'

@Injectable()
export class SonarqubeHealthService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    const urlBase = this.config.getInternalOrPublicSonarqubeUrl()
    if (!urlBase) return indicator.down('Not configured')

    const url = new URL('/api/system/health', urlBase).toString()
    const token = this.config.sonarqubeToken
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Basic ${Buffer.from(`${token}:`, 'utf8').toString('base64')}`
    }

    try {
      const response = await fetch(url, { headers })
      if (response.status < 500) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
