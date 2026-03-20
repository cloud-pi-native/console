import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { KeycloakModule } from '../../../modules/keycloak/keycloak.module'
import { DatabaseHealthService } from '../database/database-health.service'
import { HealthController } from './health.controller'

@Module({
  imports: [
    TerminusModule,
    DatabaseHealthService,
    KeycloakModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
