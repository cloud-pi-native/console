import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { observabilityConfigFactory } from '../../config/observability.config'
import { GitlabModule } from '../gitlab/gitlab.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { ObservabilityClientService } from './observability-client.service'
import { ObservabilityDatastoreService } from './observability-datastore.service'
import { ObservabilityPluginService } from './observability-plugin.service'
import { ObservabilityService } from './observability.service'

@Module({
  imports: [
    DatabaseModule,
    GitlabModule,
    KeycloakModule,
    ConfigModule.forFeature(observabilityConfigFactory),
  ],
  providers: [
    ObservabilityClientService,
    ObservabilityDatastoreService,
    ObservabilityPluginService,
    ObservabilityService,
  ],
  exports: [ObservabilityPluginService, ObservabilityService],
})
export class ObservabilityModule {}
