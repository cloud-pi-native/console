import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'

@Injectable()
export class KeycloakHealthService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    const protocol = this.config.keycloakProtocol
    const domain = this.config.keycloakDomain
    const realm = this.config.keycloakRealm
    if (!protocol || !domain || !realm) return indicator.down('Not configured')

    const baseUrl = `${protocol}://${domain}`
    const url = new URL(`/realms/${encodeURIComponent(realm)}/.well-known/openid-configuration`, baseUrl).toString()
    try {
      const response = await fetch(url)
      if (response.status < 500) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
