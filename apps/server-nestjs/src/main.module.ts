import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TerminusModule } from '@nestjs/terminus'
import { baseConfigFactory } from './config/base.config'
import { AdminRoleModule } from './modules/core/admin-role/admin-role.module'
import { AdminTokenModule } from './modules/core/admin-token/admin-token.module'
import { AuthModule } from './modules/core/auth/auth.module'
import { ClusterModule } from './modules/core/cluster/cluster.module'
import { DeploymentModule } from './modules/core/deployment/deployment.module'
import { EnvironmentModule } from './modules/core/environment/environment.module'
import { HealthzModule } from './modules/core/healthz/healthz.module'
import { LogModule } from './modules/core/log/log.module'
import { PluginModule } from './modules/core/plugin/plugin.module'
import { ProjectBulkModule } from './modules/core/project-bulk/project-bulk.module'
import { ProjectHooksModule } from './modules/core/project-hooks/project-hooks.module'
import { ProjectMembersModule } from './modules/core/project-members/project-members.module'
import { ProjectRolesModule } from './modules/core/project-roles/project-roles.module'
import { ProjectSecretsModule } from './modules/core/project-secrets/project-secrets.module'
import { ProjectServicesModule } from './modules/core/project-services/project-services.module'
import { ProjectModule } from './modules/core/project/project.module'
import { RepositoryModule } from './modules/core/repository/repository.module'
import { ServiceMonitorModule } from './modules/core/service-monitor/service-monitor.module'
import { StageModule } from './modules/core/stage/stage.module'
import { SystemConfigModule } from './modules/core/system-config/system-config.module'
import { SystemSettingsModule } from './modules/core/system-settings/system-settings.module'
import { UserModule } from './modules/core/user/user.module'
import { VersionModule } from './modules/core/version/version.module'
import { ZoneModule } from './modules/core/zone/zone.module'
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module'
import { KeycloakModule } from './modules/integrations/keycloak/keycloak.module'
import { UserTokensModule } from './modules/user-tokens/user-tokens.module'
import { getDotenvPaths } from './utils/dotenv.utils'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getDotenvPaths(),
      isGlobal: true,
      load: [baseConfigFactory],
    }),
    TerminusModule.forRoot(),
    AdminRoleModule,
    AdminTokenModule,
    AuthModule,
    ClusterModule,
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
    ProjectModule,
    ProjectRolesModule,
    ProjectSecretsModule,
    ProjectServicesModule,
    RepositoryModule,
    ServiceMonitorModule,
    ScheduleModule.forRoot(),
    StageModule,
    SystemConfigModule,
    SystemSettingsModule,
    UserModule,
    UserTokensModule,
    VersionModule,
    ZoneModule,
  ],
  controllers: [],
  providers: [],
})
export class MainModule {}
