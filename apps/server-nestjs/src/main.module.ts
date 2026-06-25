import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { DeploymentModule } from './modules/core/deployment/deployment.module'
import { HealthzModule } from './modules/core/healthz/healthz.module'
import { LogModule } from './modules/core/log/log.module'
import { ProjectBulkModule } from './modules/core/project-bulk/project-bulk.module'
import { ProjectHooksModule } from './modules/core/project-hooks/project-hooks.module'
import { ProjectMembersModule } from './modules/core/project-members/project-members.module'
import { ProjectRolesModule } from './modules/core/project-roles/project-roles.module'
import { ProjectSecretsModule } from './modules/core/project-secrets/project-secrets.module'
import { ProjectServicesModule } from './modules/core/project-services/project-services.module'
import { ProjectModule } from './modules/core/project/project.module'
import { ServiceChainModule } from './modules/core/service-chain/service-chain.module'
import { SystemSettingsModule } from './modules/core/system-settings/system-settings.module'
import { VersionModule } from './modules/core/version/version.module'
import { KeycloakModule } from './modules/plugins/keycloak/keycloak.module'

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
    ProjectBulkModule,
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
