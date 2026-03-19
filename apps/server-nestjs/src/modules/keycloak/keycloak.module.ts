import KcAdminClient from '@keycloak/keycloak-admin-client'
import { Module } from '@nestjs/common'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { InfrastructureModule } from '../../cpin-module/infrastructure/infrastructure.module'
import { KEYCLOAK_ADMIN_CLIENT, KeycloakClientService } from './keycloak-client.service'
import { KeycloakControllerService } from './keycloak-controller.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { KeycloakHealthService } from './keycloak-health.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule],
  providers: [
    {
      provide: KEYCLOAK_ADMIN_CLIENT,
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => new KcAdminClient({
        baseUrl: `${config.keycloakProtocol}://${config.keycloakDomain}`,
      }),
    },
    KeycloakControllerService,
    KeycloakDatastoreService,
    KeycloakClientService,
    KeycloakHealthService,
  ],
  exports: [KeycloakClientService, KeycloakHealthService],
})
export class KeycloakModule {}
