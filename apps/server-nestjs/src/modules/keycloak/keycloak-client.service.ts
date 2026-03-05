import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'

@Injectable()
export class KeycloakClientService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakClientService.name)
  client: KcAdminClient

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
    this.client = new KcAdminClient({
      baseUrl: `${config.keycloakProtocol}://${config.keycloakDomain}`,
      realmName: config.keycloakRealm,
    })
  }

  async onModuleInit() {
    if (!this.config.keycloakAdmin || !this.config.keycloakAdminPassword) {
      this.logger.fatal('Keycloak admin or admin password not configured')
      return
    }
    await this.client.auth({
      clientId: 'admin-cli',
      grantType: 'password',
      username: this.config.keycloakAdmin,
      password: this.config.keycloakAdminPassword,
    })
    this.logger.log('Keycloak Admin Client authenticated')
  }
}
