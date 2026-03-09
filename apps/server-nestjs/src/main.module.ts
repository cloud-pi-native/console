import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'

import { CpinModule } from './cpin-module/cpin.module'
import { KeycloakModule } from './modules/keycloak/keycloak.module'

// This module only exists to import other module.
// « One module to rule them all, and in NestJs bind them »
@Module({
  imports: [
    CpinModule,
    KeycloakModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
