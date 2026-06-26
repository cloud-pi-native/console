import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TerminusModule } from '@nestjs/terminus'
import { baseConfigFactory } from './config/base.config'
import { DeploymentModule } from './modules/deployment/deployment.module'
import { EnvironmentModule } from './modules/environment/environment.module'
import { HealthzModule } from './modules/healthz/healthz.module'
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module'
import { KeycloakModule } from './modules/keycloak/keycloak.module'
import { LogModule } from './modules/log/log.module'
import { PluginModule } from './modules/plugin/plugin.module'
import { ProjectBulkModule } from './modules/project-bulk/project-bulk.module'
import { ProjectHooksModule } from './modules/project-hooks/project-hooks.module'
import { ProjectMembersModule } from './modules/project-members/project-members.module'
import { ProjectRolesModule } from './modules/project-roles/project-roles.module'
import { ProjectSecretsModule } from './modules/project-secrets/project-secrets.module'
import { ProjectServicesModule } from './modules/project-services/project-services.module'
import { ProjectModule } from './modules/project/project.module'
import { RepositoryModule } from './modules/repository/repository.module'
import { SystemConfigModule } from './modules/system-config/system-config.module'
import { ServiceChainModule } from './modules/service-chain/service-chain.module'
import { SystemSettingsModule } from './modules/system-settings/system-settings.module'
import { UserTokensModule } from './modules/user-tokens/user-tokens.module'
import { VersionModule } from './modules/version/version.module'
import { getDotenvPaths } from './utils/dotenv.utils'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getDotenvPaths(),
      isGlobal: true,
      load: [baseConfigFactory],
    }),
    TerminusModule.forRoot(),
    DeploymentModule,
    EnvironmentModule,
    HealthzModule,
    InfrastructureModule,
    KeycloakModule,
    LogModule,
    PluginModule,
    ProjectBulkModule,
    ProjectHooksModule,
    ProjectMembersModule,
    ProjectRolesModule,
    ProjectSecretsModule,
    ProjectServicesModule,
    RepositoryModule,
    ProjectModule,
    ServiceChainModule,
    SystemSettingsModule,
    ScheduleModule.forRoot(),
    SystemConfigModule,
    UserTokensModule,
    VersionModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
