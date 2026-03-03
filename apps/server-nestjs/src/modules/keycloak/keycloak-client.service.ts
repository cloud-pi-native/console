import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'

@Injectable()
export class KeycloakClientService extends KcAdminClient implements OnModuleInit {
  private readonly logger = new Logger(KeycloakClientService.name)

  constructor(
    @Inject(ConfigurationService) private readonly configService: ConfigurationService,
  ) {
    super({
      baseUrl: `${configService.keycloakProtocol}://${configService.keycloakDomain}`,
      realmName: configService.keycloakRealm,
    })
  }

  async onModuleInit() {
    try {
      await this.auth({
        grantType: 'client_credentials',
        clientId: this.configService.keycloakClientId!,
        clientSecret: this.configService.keycloakClientSecret!,
      })
      this.logger.log('Keycloak Admin Client authenticated')
    } catch (error) {
      this.logger.error('Failed to authenticate with Keycloak', error)
    }
  }
}
