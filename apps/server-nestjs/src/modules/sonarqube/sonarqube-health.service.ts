import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'
import { isRecord } from '../../utils/record.utils'
import { PLUGIN_NAME, REQUEST_ERROR_MESSAGE } from './sonarqube.constants'

@Injectable()
export class SonarqubeHealthService {
  constructor(
    @Inject(sonarqubeConfigFactory.KEY) private readonly sonarqubeConfig: ConfigType<typeof sonarqubeConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    try {
      const response = await fetch(this.healthUrl(), { headers: this.authHeaders() })
      if (response.status !== HttpStatus.OK) return indicator.down({ message: REQUEST_ERROR_MESSAGE })

      const data: unknown = await response.json()
      const health = isRecord(data) && typeof data.health === 'string' ? data.health : undefined
      if (health === 'GREEN') return indicator.up()
      if (health === 'YELLOW') return indicator.up({ message: 'Service dégradé' })
      if (health === 'RED') return indicator.down({ message: 'Service en panne' })
      return indicator.down({ message: REQUEST_ERROR_MESSAGE })
    } catch (error) {
      return indicator.down({ message: REQUEST_ERROR_MESSAGE, cause: error })
    }
  }

  private healthUrl(): string {
    return new URL('/api/system/health', this.sonarqubeConfig.internalUrl ?? this.sonarqubeConfig.url).toString()
  }

  private authHeaders(): Record<string, string> {
    const bearerToken = Buffer.from(`${this.sonarqubeConfig.apiToken}:`, 'utf-8').toString('base64')
    return { Authorization: `Bearer ${bearerToken}` }
  }
}
