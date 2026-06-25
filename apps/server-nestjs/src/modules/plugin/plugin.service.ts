import type { ServiceInfos } from '@cpn-console/hooks'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { ArgoCDPluginService } from '../argocd/argocd-plugin.service'
import { GitlabPluginService } from '../gitlab/gitlab-plugin.service'
import { KeycloakPluginService } from '../keycloak/keycloak-plugin.service'
import { NexusPluginService } from '../nexus/nexus-plugin.service'
import { RegistryPluginService } from '../registry/registry-plugin.service'
import { SonarqubePluginService } from '../sonarqube/sonarqube-plugin.service'
import { VaultPluginService } from '../vault/vault-plugin.service'

@Injectable()
export class PluginService {
  private readonly logger = new Logger(PluginService.name)

  // keycloak/vault are mandatory always-on modules; the other 5 are gated by USE_*.
  constructor(
    @Inject(KeycloakPluginService) private readonly keycloakPlugin: KeycloakPluginService,
    @Inject(VaultPluginService) private readonly vaultPlugin: VaultPluginService,
    @Inject(ArgoCDPluginService) @Optional() private readonly argoCDPlugin?: ArgoCDPluginService,
    @Inject(GitlabPluginService) @Optional() private readonly gitlabPlugin?: GitlabPluginService,
    @Inject(RegistryPluginService) @Optional() private readonly registryPlugin?: RegistryPluginService,
    @Inject(NexusPluginService) @Optional() private readonly nexusPlugin?: NexusPluginService,
    @Inject(SonarqubePluginService) @Optional() private readonly sonarqubePlugin?: SonarqubePluginService,
  ) {}

  async infos(projectId: string): Promise<ServiceInfos[]> {
    const plugins: [string, () => ServiceInfos | Promise<ServiceInfos>][] = [
      ['keycloak', () => this.keycloakPlugin.infos()],
      ['vault', () => this.vaultPlugin.infos()],
    ]
    if (this.argoCDPlugin) { plugins.push(['argocd', () => this.argoCDPlugin!.infos()]) }
    if (this.gitlabPlugin) { plugins.push(['gitlab', () => this.gitlabPlugin!.infos()]) }
    if (this.registryPlugin) { plugins.push(['registry', () => this.registryPlugin!.infos(projectId)]) }
    if (this.nexusPlugin) { plugins.push(['nexus', () => this.nexusPlugin!.infos()]) }
    if (this.sonarqubePlugin) { plugins.push(['sonarqube', () => this.sonarqubePlugin!.infos()]) }

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
