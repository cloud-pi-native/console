import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { DeploymentModule } from './modules/deployment/deployment.module'
import { HealthzModule } from './modules/healthz/healthz.module'
import { KeycloakModule } from './modules/keycloak/keycloak.module'
import { ProjectModule } from './modules/project/project.module'
import { ServiceChainModule } from './modules/service-chain/service-chain.module'
import { SystemConfigModule } from './modules/system-config/system-config.module'
import { SystemSettingsModule } from './modules/system-settings/system-settings.module'
import { VersionModule } from './modules/version/version.module'

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    HealthzModule,
    KeycloakModule,
    ScheduleModule.forRoot(),
    SystemSettingsModule,
    SystemConfigModule,
    ServiceChainModule,
    ProjectModule,
    AdminRoleModule,
    DeploymentModule,
    VersionModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
