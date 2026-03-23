import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { KeycloakModule } from '../../../modules/keycloak/keycloak.module'
import { DatabaseModule } from '../database/database.module'
import { HealthController } from './health.controller'

@Module({
  imports: [
    TerminusModule,
    DatabaseModule,
    KeycloakModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
