import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { optIn } from '../../utils/config.utils'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'
import { ServiceChainModule } from '../service-chain/service-chain.module'
import { SonarqubeModule } from '../sonarqube/sonarqube.module'
import { VaultModule } from '../vault/vault.module'
import { PluginService } from './plugin.service'

@Module({
  imports: [
    ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD'),
    ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'),
    ConditionalModule.registerWhen(NexusModule, 'USE_NEXUS'),
    ConditionalModule.registerWhen(RegistryModule, 'USE_HARBOR'),
    ConditionalModule.registerWhen(ServiceChainModule, optIn('USE_SERVICE_CHAIN')),
    ConditionalModule.registerWhen(SonarqubeModule, 'USE_SONARQUBE'),
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
    KeycloakModule,
  ],
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {}
