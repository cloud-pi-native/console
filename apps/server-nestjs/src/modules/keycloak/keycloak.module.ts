import KcAdminClient from '@keycloak/keycloak-admin-client'
import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { KEYCLOAK_ADMIN_CLIENT, KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { KeycloakHealthService } from './keycloak-health.service'
import { KeycloakPluginService } from './keycloak-plugin.service'
import { KeycloakService } from './keycloak.service'

@Module({
  imports: [ConfigurationModule, DatabaseModule, TerminusModule],
  providers: [
    {
      inject: [ConfigurationService],
      provide: KEYCLOAK_ADMIN_CLIENT,
      useFactory: (config: ConfigurationService) => new KcAdminClient({
        baseUrl: config.getKeycloakUrl(),
      }),
    },
    KeycloakClientService,
    KeycloakDatastoreService,
    KeycloakHealthService,
    KeycloakPluginService,
    KeycloakService,
  ],
  exports: [KeycloakClientService, KeycloakHealthService, KeycloakPluginService, KeycloakService],
})
export class KeycloakModule {}
