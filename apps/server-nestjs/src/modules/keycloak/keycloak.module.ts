import type { KeycloakConfig } from '../../config/keycloak'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import keycloakConfigFactory from '../../config/keycloak'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { KEYCLOAK_ADMIN_CLIENT, KeycloakClientService } from './keycloak-client.service'
import { KeycloakDatastoreService } from './keycloak-datastore.service'
import { KeycloakHealthService } from './keycloak-health.service'
import { KeycloakPluginService } from './keycloak-plugin.service'
import { KeycloakService } from './keycloak.service'

@Module({
  imports: [ConfigModule.forFeature([keycloakConfigFactory]), DatabaseModule, TerminusModule],
  providers: [
    {
      inject: [keycloakConfigFactory.KEY],
      provide: KEYCLOAK_ADMIN_CLIENT,
      useFactory: (config: KeycloakConfig) => new KcAdminClient({
        baseUrl: config.keycloakUrl,
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
