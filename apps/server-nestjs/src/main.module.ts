import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'

import { CpinModule } from './cpin-module/cpin.module'
import { HealthzModule } from './modules/healthz/healthz.module'
import { KeycloakModule } from './modules/keycloak/keycloak.module'

@Module({
  imports: [
    CpinModule,
    KeycloakModule,
    HealthzModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
