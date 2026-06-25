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

  constructor(
    @Inject(KeycloakPluginService) private readonly keycloakPlugin: KeycloakPluginService,
    @Inject(VaultPluginService) @Optional() private readonly vaultPlugin?: VaultPluginService,
    @Inject(ArgoCDPluginService) @Optional() private readonly argoCDPlugin?: ArgoCDPluginService,
    @Inject(GitlabPluginService) @Optional() private readonly gitlabPlugin?: GitlabPluginService,
    @Inject(NexusPluginService) @Optional() private readonly nexusPlugin?: NexusPluginService,
    @Inject(RegistryPluginService) @Optional() private readonly registryPlugin?: RegistryPluginService,
    @Inject(SonarqubePluginService) @Optional() private readonly sonarqubePlugin?: SonarqubePluginService,
  ) {}

  async infos(projectId: string): Promise<ServiceInfos[]> {
    const plugins: Array<[string, () => ServiceInfos | undefined | Promise<ServiceInfos | undefined>]> = [
      ['argocd', () => this.argoCDPlugin?.infos()],
      ['gitlab', () => this.gitlabPlugin?.infos()],
      ['registry', () => this.registryPlugin?.infos(projectId)],
      ['keycloak', () => this.keycloakPlugin.infos()],
      ['nexus', () => this.nexusPlugin?.infos()],
      ['sonarqube', () => this.sonarqubePlugin?.infos()],
      ['vault', () => this.vaultPlugin?.infos()],
    ]

    const settled = await Promise.allSettled(plugins.map(([, fn]) => fn()))
    return settled.flatMap((result, i) => {
      if (result.status === 'fulfilled') return result.value ? [result.value] : []
      this.logger.warn(`Skipping project service plugin ${plugins[i][0]} because infos() failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`)
      return []
    })
  }
}
