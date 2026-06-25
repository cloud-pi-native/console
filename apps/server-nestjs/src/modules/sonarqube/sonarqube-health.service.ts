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
    const headers: Record<string, string> = {}
    const bearerToken = Buffer.from(`${this.sonarqubeConfig.apiToken}:`, 'utf-8').toString('base64')
    headers.Authorization = `Bearer ${bearerToken}`
    try {
      const response = await fetch(this.sonarqubeConfig.probeUrl, { headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
