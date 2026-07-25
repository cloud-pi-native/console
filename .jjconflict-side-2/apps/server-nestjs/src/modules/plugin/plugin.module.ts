import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { argocdConfigFactory } from '../../config/argocd.config'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { harborConfigFactory } from '../../config/harbor.config'
import { keycloakConfigFactory } from '../../config/keycloak.config'
import { nexusConfigFactory } from '../../config/nexus.config'
import { registryConfigFactory } from '../../config/registry.config'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'
import { vaultConfigFactory } from '../../config/vault.config'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { HarborModule, RegistryModule } from '../registry/registry.module'
import { SonarqubeModule } from '../sonarqube/sonarqube.module'
import { VaultModule } from '../vault/vault.module'
import { PluginService } from './plugin.service'

@Module({
  imports: [
    ConditionalModule.registerWhen(ArgoCDModule.forRoot(argocdConfigFactory.asProvider()), 'USE_ARGOCD'),
    ConditionalModule.registerWhen(GitlabModule.forRoot(gitlabConfigFactory.asProvider()), 'USE_GITLAB'),
    ConditionalModule.registerWhen(RegistryModule.forRoot(registryConfigFactory.asProvider()), 'USE_REGISTRY'),
    ConditionalModule.registerWhen(HarborModule.forRoot(harborConfigFactory.asProvider()), 'USE_REGISTRY'),
    ConditionalModule.registerWhen(KeycloakModule.forRoot(keycloakConfigFactory.asProvider()), 'USE_KEYCLOAK'),
    ConditionalModule.registerWhen(NexusModule.forRoot(nexusConfigFactory.asProvider()), 'USE_NEXUS'),
    ConditionalModule.registerWhen(SonarqubeModule.forRoot(sonarqubeConfigFactory.asProvider()), 'USE_SONARQUBE'),
    ConditionalModule.registerWhen(VaultModule.forRoot(vaultConfigFactory.asProvider()), 'USE_VAULT'),
  ],
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {}
