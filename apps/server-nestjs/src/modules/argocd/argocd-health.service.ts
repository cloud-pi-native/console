import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { PLUGIN_NAME } from './argocd.constants'

@Injectable()
export class ArgoCDHealthService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    const urlBase = this.config.getInternalOrPublicArgoCDUrl()
    if (!urlBase) return indicator.down('Not configured')

    try {
      const response = await fetch(new URL('/api/version', urlBase).toString())
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
