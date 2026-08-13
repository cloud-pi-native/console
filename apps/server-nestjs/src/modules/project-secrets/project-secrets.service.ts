import type { GitlabMirrorGroupSecret, NexusGroupSecret, RegistryGroupSecret } from '../vault/vault-client.service'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { GitlabPluginService } from '../gitlab/gitlab-plugin.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { NexusPluginService } from '../nexus/nexus-plugin.service'
import { RegistryPluginService } from '../registry/registry-plugin.service'
import { VaultPluginService } from '../vault/vault-plugin.service'
import { maybeCollectServiceSecrets } from './project-secrets.utils'

@Injectable()
export class ProjectSecretsService {
  private readonly logger = new Logger(ProjectSecretsService.name)

  constructor(
    @Inject(GitlabPluginService) @Optional() private readonly gitlabService?: GitlabPluginService,
    @Inject(NexusPluginService) @Optional() private readonly nexusService?: NexusPluginService,
    @Inject(RegistryPluginService) @Optional() private readonly registryService?: RegistryPluginService,
    @Inject(VaultPluginService) @Optional() private readonly vaultService?: VaultPluginService,
  ) {}

  @StartActiveSpan()
  async get(projectId: string): Promise<Record<string, Record<string, string>>> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.get started (projectId=${projectId})`)

    const result = await this.collectSecrets(projectId)
    const groupCount = Object.keys(result).length
    const keyCount = Object.values(result).reduce((acc, group) => acc + Object.keys(group).length, 0)
    span?.setAttributes({
      'vault.secretGroups.count': groupCount,
      'vault.secretKeys.count': keyCount,
    })
    this.logger.log(`project.get completed (projectId=${projectId}, groupCount=${groupCount}, keyCount=${keyCount})`)
    return result
  }

  private async collectSecrets(projectId: string): Promise<Record<string, Record<string, string>>> {
    const [gitlab, nexus, registry, vault] = await Promise.all([
      maybeCollectServiceSecrets<Partial<GitlabMirrorGroupSecret>>(projectId, 'GITLAB', this.gitlabService),
      maybeCollectServiceSecrets<NexusGroupSecret>(projectId, 'NEXUS', this.nexusService),
      maybeCollectServiceSecrets<RegistryGroupSecret>(projectId, 'REGISTRY', this.registryService),
      maybeCollectServiceSecrets(projectId, 'VAULT', this.vaultService),
    ])
    return {
      ...gitlab,
      ...nexus,
      ...registry,
      ...vault,
    }
  }
}
