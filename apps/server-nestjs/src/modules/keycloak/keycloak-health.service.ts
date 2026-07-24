import type { KeycloakConfig } from '../../config/keycloak'
import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { InjectKeycloakConfig } from '../../config/keycloak'

@Injectable()
export class KeycloakHealthService {
  constructor(
    @InjectKeycloakConfig()
    private readonly config: KeycloakConfig,
    @Inject(HealthIndicatorService)
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    if (!this.config.keycloakDomain) return indicator.down('Not configured')
    const url = this.config.keycloakOpenidConfigurationUrl

    try {
      const response = await fetch(url)
      if (response.status < 500) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
