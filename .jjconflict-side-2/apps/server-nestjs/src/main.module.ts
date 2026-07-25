import { Module } from '@nestjs/common'
import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TerminusModule } from '@nestjs/terminus'
import { baseConfigFactory } from './config/base.config'
import { keycloakConfigFactory } from './config/keycloak.config'
import { DeploymentModule } from './modules/deployment/deployment.module'
import { EnvironmentModule } from './modules/environment/environment.module'
import { HealthzModule } from './modules/healthz/healthz.module'
import { BaseModule } from './modules/infrastructure/config/base.module'
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module'
import { KeycloakModule } from './modules/keycloak/keycloak.module'
import { LogModule } from './modules/log/log.module'
import { ProjectBulkModule } from './modules/project-bulk/project-bulk.module'
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
    ConfigModule.forRoot(),
    BaseModule.forRoot(baseConfigFactory.asProvider()),
    TerminusModule.forRoot(),
    InfrastructureModule,
    HealthzModule,
    ConditionalModule.registerWhen(KeycloakModule.forRoot(keycloakConfigFactory.asProvider()), 'USE_KEYCLOAK'),
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
    EnvironmentModule,
    VersionModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
