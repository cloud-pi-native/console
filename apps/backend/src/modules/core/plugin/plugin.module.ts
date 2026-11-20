import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { optIn } from '../../../utils/config.utils'
import { ArgoCDModule } from '../../integrations/argocd/argocd.module'
import { GitlabModule } from '../../integrations/gitlab/gitlab.module'
import { KeycloakModule } from '../../integrations/keycloak/keycloak.module'
import { NexusModule } from '../../integrations/nexus/nexus.module'
import { ObservabilityModule } from '../../integrations/observability/observability.module'
import { RegistryModule } from '../../integrations/registry/registry.module'
import { SonarqubeModule } from '../../integrations/sonarqube/sonarqube.module'
import { VaultModule } from '../../integrations/vault/vault.module'
import { ServiceChainModule } from '../service-chain/service-chain.module'
import { PluginService } from './plugin.service'

@Module({
  imports: [
    ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD'),
    ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'),
    KeycloakModule,
    ConditionalModule.registerWhen(NexusModule, 'USE_NEXUS'),
    ConditionalModule.registerWhen(ObservabilityModule, 'USE_OBSERVABILITY'),
    ConditionalModule.registerWhen(RegistryModule, 'USE_HARBOR'),
    ConditionalModule.registerWhen(ServiceChainModule, optIn('USE_SERVICE_CHAIN')),
    ConditionalModule.registerWhen(SonarqubeModule, 'USE_SONARQUBE'),
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
  ],
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {}
