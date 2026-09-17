import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { UserPermissionModule } from '../infrastructure/permission/user/user.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'
import { SonarqubeModule } from '../sonarqube/sonarqube.module'
import { VaultModule } from '../vault/vault.module'
import { ServiceMonitorController } from './service-monitor.controller'
import { ServiceMonitorService } from './service-monitor.service'

@Module({
  imports: [
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
