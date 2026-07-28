import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { keycloakConfigFactory } from '../../config/keycloak.config'

@Injectable()
export class KeycloakHealthService {
  constructor(
    @Inject(keycloakConfigFactory.KEY)
    private readonly keycloakConfig: ConfigType<typeof keycloakConfigFactory>,
    @Inject(HealthIndicatorService)
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    if (!this.keycloakConfig.openidConfigurationUrl) {
      return indicator.down('Keycloak is not configured')
    }
    try {
      const response = await fetch(this.keycloakConfig.openidConfigurationUrl)
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
