import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { CpinModule } from './cpin-module/cpin.module'
import { HealthzModule } from './modules/healthz/healthz.module'
import { KeycloakModule } from './modules/keycloak/keycloak.module'
import { ServiceChainModule } from './modules/service-chain/service-chain.module'
import { VersionModule } from './modules/version/version.module'

@Module({
  imports: [
    CpinModule,
    EventEmitterModule.forRoot(),
    HealthzModule,
    KeycloakModule,
    ScheduleModule.forRoot(),
    ServiceChainModule,
    VersionModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
