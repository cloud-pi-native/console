import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'
import { SonarqubeModule } from '../sonarqube/sonarqube.module'
import { VaultModule } from '../vault/vault.module'
import { PluginService } from './plugin.service'

@Module({
  imports: [
    ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD'),
    ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'),
    ConditionalModule.registerWhen(RegistryModule, 'USE_REGISTRY'),
    ConditionalModule.registerWhen(KeycloakModule, 'USE_KEYCLOAK'),
    ConditionalModule.registerWhen(NexusModule, 'USE_NEXUS'),
    ConditionalModule.registerWhen(SonarqubeModule, 'USE_SONARQUBE'),
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
  ],
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {}
