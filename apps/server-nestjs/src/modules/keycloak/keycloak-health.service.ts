import type { KeycloakConfig } from './keycloak.module-definition'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { KEYCLOAK_CONFIG } from './keycloak.module-definition'

@Injectable()
export class KeycloakHealthService {
  constructor(
    @Inject(KEYCLOAK_CONFIG)
    private readonly keycloakConfig: KeycloakConfig,
    @Inject(HealthIndicatorService)
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    const url = this.keycloakConfig.openidConfigurationUrl
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
