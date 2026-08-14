import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { hasEntries } from '../../utils/record.utils'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { GitlabService } from '../gitlab/gitlab.service'
import { NexusService } from '../nexus/nexus.service'
import { RegistryService } from '../registry/registry.service'
import { VaultService } from '../vault/vault.service'

@Injectable()
export class ProjectSecretsService {
  private readonly logger = new Logger(ProjectSecretsService.name)

  constructor(
    @Inject(GitlabService) @Optional() private readonly gitlabService?: GitlabService,
    @Inject(NexusService) @Optional() private readonly nexusService?: NexusService,
    @Inject(RegistryService) @Optional() private readonly registryService?: RegistryService,
    @Inject(VaultService) @Optional() private readonly vaultService?: VaultService,
  ) {}

  @StartActiveSpan()
  async get(projectId: string): Promise<Record<string, Record<string, string>>> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.get started (projectId=${projectId})`)

    const result: Record<string, Record<string, string>> = {}
    if (this.gitlabService) {
      const group = await this.gitlabService.getSecrets(projectId)
      if (hasEntries(group)) result.GITLAB = group
    }
    if (this.nexusService) {
      const group = await this.nexusService.getSecrets(projectId)
      if (hasEntries(group)) result.NEXUS = group
    }
    if (this.registryService) {
      const group = await this.registryService.getSecrets(projectId)
      if (hasEntries(group)) result.REGISTRY = group
    }
    if (this.vaultService) {
      const group = await this.vaultService.getSecrets(projectId)
      if (hasEntries(group)) result.VAULT = group
    }

    const groupCount = Object.keys(result).length
    const keyCount = Object.values(result).reduce((acc, group) => acc + Object.keys(group).length, 0)
    span?.setAttributes({
      'vault.secretGroups.count': groupCount,
      'vault.secretKeys.count': keyCount,
    })
    this.logger.log(`project.get completed (projectId=${projectId}, groupCount=${groupCount}, keyCount=${keyCount})`)
    return result
  }
}
