import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { DeploymentModule } from './modules/deployment/deployment.module'
import { HealthzModule } from './modules/healthz/healthz.module'
import { KeycloakModule } from './modules/keycloak/keycloak.module'
import { LogModule } from './modules/log/log.module'
import { ProjectHooksModule } from './modules/project-hooks/project-hooks.module'
import { ProjectMembersModule } from './modules/project-members/project-members.module'
import { ProjectRolesModule } from './modules/project-roles/project-roles.module'
import { ProjectSecretsModule } from './modules/project-secrets/project-secrets.module'
import { ProjectServicesModule } from './modules/project-services/project-services.module'
import { ProjectModule } from './modules/project/project.module'
import { ServiceChainModule } from './modules/service-chain/service-chain.module'
import { SystemSettingsModule } from './modules/system-settings/system-settings.module'
import { VersionModule } from './modules/version/version.module'

@Module({
  imports: [
    HealthzModule,
    KeycloakModule,
    ScheduleModule.forRoot(),
    SystemSettingsModule,
    ServiceChainModule,
    ProjectModule,
    ProjectHooksModule,
    ProjectSecretsModule,
    ProjectServicesModule,
    ProjectMembersModule,
    ProjectRolesModule,
    LogModule,
    DeploymentModule,
    VersionModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
