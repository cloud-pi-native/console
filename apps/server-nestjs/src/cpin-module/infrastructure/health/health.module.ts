import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { KeycloakModule } from '../../../modules/keycloak/keycloak.module'
import { ConfigurationModule } from '../configuration/configuration.module'
import { DatabaseHealthService } from '../database/database-health.service'
import { InfrastructureModule } from '../infrastructure.module'
import { HealthController } from './health.controller'

@Module({
  imports: [
    TerminusModule,
    ConfigurationModule,
    InfrastructureModule,
    DatabaseHealthService,
    KeycloakModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
