import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { z } from 'zod'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'
import { REQUEST_ERROR_MESSAGE } from '../service-monitor/service-monitor.constants'
import { PLUGIN_NAME } from './sonarqube.constants'

const sonarqubeHealthBodySchema = z.object({ health: z.string() })

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

      const parsed = sonarqubeHealthBodySchema.safeParse(await response.json())
      if (!parsed.success) return indicator.down({ message: REQUEST_ERROR_MESSAGE })
      if (parsed.data.health === 'GREEN') return indicator.up()
      if (parsed.data.health === 'YELLOW') return indicator.up({ message: 'Service dégradé' })
      if (parsed.data.health === 'RED') return indicator.down({ message: 'Service en panne' })
      return indicator.down({ message: REQUEST_ERROR_MESSAGE })
    } catch (error) {
      return indicator.down({ message: REQUEST_ERROR_MESSAGE, cause: error })
    }
  }

  private healthUrl(): string {
    return new URL('/api/system/health', this.sonarqubeConfig.internalUrl ?? this.sonarqubeConfig.url).toString()
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.sonarqubeConfig.apiToken}` }
  }
}
