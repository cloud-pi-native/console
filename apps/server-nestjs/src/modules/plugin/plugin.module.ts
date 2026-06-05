import { Module } from '@nestjs/common'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'
import { SonarqubeModule } from '../sonarqube/sonarqube.module'
import { VaultModule } from '../vault/vault.module'
import { PluginService } from './plugin.service'

@Module({
  imports: [ArgoCDModule, GitlabModule, RegistryModule, KeycloakModule, NexusModule, SonarqubeModule, VaultModule],
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {}
