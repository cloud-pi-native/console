import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '@/cpin-module/infrastructure/infrastructure.module'
import { DatabaseHealthService } from '@/cpin-module/infrastructure/database/database-health.service'
import { KeycloakHealthService } from '../../../modules/keycloak/keycloak-health.service'
import { HealthController } from './health.controller'

@Module({
  imports: [TerminusModule, ConfigurationModule, InfrastructureModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthService,
    KeycloakHealthService,
  ],
})
export class HealthModule {}
