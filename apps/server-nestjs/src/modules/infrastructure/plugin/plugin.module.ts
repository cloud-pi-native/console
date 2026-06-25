import { Module } from '@nestjs/common'
import { ArgoCDModule } from '../argocd/argocd.module.js'
import { GitlabModule } from '../gitlab/gitlab.module.js'
import { KeycloakModule } from '../keycloak/keycloak.module.js'
import { NexusModule } from '../nexus/nexus.module.js'
import { RegistryModule } from '../registry/registry.module.js'
import { SonarqubeModule } from '../sonarqube/sonarqube.module.js'
import { VaultModule } from '../vault/vault.module.js'
import { PluginService } from './plugin.service.js'

@Module({
  imports: [ArgoCDModule, GitlabModule, RegistryModule, KeycloakModule, NexusModule, SonarqubeModule, VaultModule],
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {}
