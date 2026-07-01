import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { AdminTokenModule } from './modules/admin-token/admin-token.module'
import { DeploymentModule } from './modules/deployment/deployment.module'
import { HealthzModule } from './modules/healthz/healthz.module'
import { KeycloakModule } from './modules/keycloak/keycloak.module'
import { ProjectModule } from './modules/project/project.module'
import { ServiceChainModule } from './modules/service-chain/service-chain.module'
import { SystemSettingsModule } from './modules/system-settings/system-settings.module'
import { UserTokensModule } from './modules/user-tokens/user-tokens.module'
import { VersionModule } from './modules/version/version.module'

@Module({
  imports: [
    AdminTokenModule,
    HealthzModule,
    KeycloakModule,
    ScheduleModule.forRoot(),
    SystemSettingsModule,
    ServiceChainModule,
    ProjectModule,
    DeploymentModule,
    UserTokensModule,
    VersionModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
