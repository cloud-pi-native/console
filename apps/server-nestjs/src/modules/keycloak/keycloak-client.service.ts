import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'

@Injectable()
export class KeycloakClientService extends KcAdminClient implements OnModuleInit {
  private readonly logger = new Logger(KeycloakClientService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
    super({
      baseUrl: `${config.keycloakProtocol}://${config.keycloakDomain}`,
      realmName: config.keycloakRealm,
    })
  }

  async onModuleInit() {
    if (!this.config.keycloakClientId || !this.config.keycloakClientSecret) {
      this.logger.fatal('Keycloak client ID or secret not configured')
      return
    }
    await this.auth({
      grantType: 'client_credentials',
      clientId: this.config.keycloakClientId,
      clientSecret: this.config.keycloakClientSecret,
    })
    this.logger.log('Keycloak Admin Client authenticated')
  }
}
