import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { argocdConfigFactory } from '../../config/argocd.config'
import { PLUGIN_NAME } from './argocd.constants'

@Injectable()
export class ArgoCDHealthService {
  constructor(
    @Inject(argocdConfigFactory.KEY) private readonly argocdConfig: ConfigType<typeof argocdConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    try {
      const url = new URL('/api/version', this.argocdConfig.internalUrl ?? this.argocdConfig.url).toString()
      const response = await fetch(url)
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
