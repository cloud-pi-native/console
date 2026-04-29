import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { DeploymentModule } from './modules/deployment/deployment.module.js'
import { HealthzModule } from './modules/healthz/healthz.module'
import { KeycloakModule } from './modules/keycloak/keycloak.module'
import { ProjectModule } from './modules/project/project.module.js'
import { ServiceChainModule } from './modules/service-chain/service-chain.module'
import { VersionModule } from './modules/version/version.module'

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    HealthzModule,
    KeycloakModule,
    ScheduleModule.forRoot(),
    ServiceChainModule,
    ProjectModule,
    DeploymentModule,
    VersionModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
