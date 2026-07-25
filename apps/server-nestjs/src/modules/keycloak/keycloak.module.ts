import type { KeycloakConfig } from './keycloak.module-definition'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { KEYCLOAK_ADMIN_CLIENT, KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { KeycloakHealthService } from './keycloak-health.service'
import { KeycloakPluginService } from './keycloak-plugin.service'
import { ConfigurableModuleClass, KEYCLOAK_CONFIG } from './keycloak.module-definition'
import { KeycloakService } from './keycloak.service'

@Module({
  imports: [DatabaseModule, TerminusModule],
  providers: [
    {
      inject: [KEYCLOAK_CONFIG],
      provide: KEYCLOAK_ADMIN_CLIENT,
      useFactory: (config: KeycloakConfig) => new KcAdminClient({
        baseUrl: config.url,
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
export class KeycloakModule extends ConfigurableModuleClass {}
