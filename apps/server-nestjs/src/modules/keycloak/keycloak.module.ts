import KcAdminClient from '@keycloak/keycloak-admin-client'
import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationService } from 'src/cpin-module/infrastructure/configuration/configuration.service'
import { ConfigurationModule } from '../../cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../../cpin-module/infrastructure/infrastructure.module'
import { KEYCLOAK_ADMIN_CLIENT, KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { KeycloakHealthService } from './keycloak-health.service'
import { KeycloakService } from './keycloak.service'

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
    HealthIndicatorService,
    KeycloakClientService,
    KeycloakDatastoreService,
    KeycloakHealthService,
    KeycloakService,
  ],
  exports: [KeycloakClientService, KeycloakHealthService],
})
export class KeycloakModule {}
