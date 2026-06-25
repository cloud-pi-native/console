import type { ServiceInfos } from '@cpn-console/hooks'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ArgoCDPluginService } from '../../plugins/argocd/argocd-plugin.service.js'
import { GitlabPluginService } from '../../plugins/gitlab/gitlab-plugin.service.js'
import { KeycloakPluginService } from '../../plugins/keycloak/keycloak-plugin.service.js'
import { NexusPluginService } from '../../plugins/nexus/nexus-plugin.service.js'
import { RegistryPluginService } from '../../plugins/registry/registry-plugin.service.js'
import { SonarqubePluginService } from '../../plugins/sonarqube/sonarqube-plugin.service.js'
import { VaultPluginService } from '../../plugins/vault/vault-plugin.service.js'

@Injectable()
export class PluginService {
  private readonly logger = new Logger(PluginService.name)

  constructor(
    @Inject(ArgoCDPluginService) private readonly argoCDPlugin: ArgoCDPluginService,
    @Inject(GitlabPluginService) private readonly gitlabPlugin: GitlabPluginService,
    @Inject(RegistryPluginService) private readonly registryPlugin: RegistryPluginService,
    @Inject(KeycloakPluginService) private readonly keycloakPlugin: KeycloakPluginService,
    @Inject(NexusPluginService) private readonly nexusPlugin: NexusPluginService,
    @Inject(SonarqubePluginService) private readonly sonarqubePlugin: SonarqubePluginService,
    @Inject(VaultPluginService) private readonly vaultPlugin: VaultPluginService,
  ) {}

  async infos(projectId: string): Promise<ServiceInfos[]> {
    const plugins = [
      ['argocd', () => this.argoCDPlugin.infos()],
      ['gitlab', () => this.gitlabPlugin.infos()],
      ['registry', () => this.registryPlugin.infos(projectId)],
      ['keycloak', () => this.keycloakPlugin.infos()],
      ['nexus', () => this.nexusPlugin.infos()],
      ['sonarqube', () => this.sonarqubePlugin.infos()],
      ['vault', () => this.vaultPlugin.infos()],
    ] as const

    const settled = await Promise.allSettled(plugins.map(([, loadInfos]) => loadInfos()))
    return settled.flatMap((result, index) => {
      const [pluginName] = plugins[index]
      if (result.status === 'fulfilled') {
        return [result.value]
      }
      this.logger.warn(`Skipping project service plugin ${pluginName} because infos() failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`)
      return []
    })
  }
}
