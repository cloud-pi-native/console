import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { AuthModule } from '../../infrastructure/auth/auth.module'
import { UserPermissionModule } from '../../infrastructure/permission/user/user.module'
import { ArgoCDModule } from '../../integrations/argocd/argocd.module'
import { GitlabModule } from '../../integrations/gitlab/gitlab.module'
import { KeycloakModule } from '../../integrations/keycloak/keycloak.module'
import { NexusModule } from '../../integrations/nexus/nexus.module'
import { RegistryModule } from '../../integrations/registry/registry.module'
import { SonarqubeModule } from '../../integrations/sonarqube/sonarqube.module'
import { VaultModule } from '../../integrations/vault/vault.module'
import { ServiceMonitorController } from './service-monitor.controller'
import { ServiceMonitorService } from './service-monitor.service'

@Module({
  imports: [
    CacheModule.register(),
    AuthModule,
    UserPermissionModule,
    KeycloakModule,
    ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD'),
    ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'),
    ConditionalModule.registerWhen(RegistryModule, 'USE_HARBOR'),
    ConditionalModule.registerWhen(NexusModule, 'USE_NEXUS'),
    ConditionalModule.registerWhen(SonarqubeModule, 'USE_SONARQUBE'),
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
  ],
  controllers: [ServiceMonitorController],
  providers: [ServiceMonitorService],
})
export class ServiceMonitorModule {}
