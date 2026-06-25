import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'

@Injectable()
export class SonarqubeHealthService {
  constructor(
    @Inject(sonarqubeConfigFactory.KEY) private readonly sonarqubeConfig: ConfigType<typeof sonarqubeConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    const url = this.sonarqubeConfig.probeUrl

    if (!url) return indicator.down('Not configured')

    const token = this.sonarqubeConfig.apiToken
    const headers: Record<string, string> = {}
    if (token) {
      const bearerToken = Buffer.from(`${token}:`, 'utf-8').toString('base64')
      headers.Authorization = `Bearer ${bearerToken}`
    }

    try {
      const response = await fetch(url, { headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
