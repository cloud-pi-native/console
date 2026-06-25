import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { PLUGIN_NAME } from './keycloak.constants'

@Injectable()
export class KeycloakHealthService {
  constructor(
    @Inject(ConfigurationService)
    private readonly config: ConfigurationService,
    @Inject(HealthIndicatorService)
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    const url = this.config.getKeycloakOpenidConfigurationUrl()
    if (!url) return indicator.down('Not configured')

    try {
      const response = await fetch(url)
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
