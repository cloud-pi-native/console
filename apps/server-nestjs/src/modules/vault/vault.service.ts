import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import type { VaultSecret } from './vault-client.service'
import { generateAppAdminPolicyName, generateTechnicalReadOnlyPolicyName, generateZoneName } from './vault.utils'
import type { ProjectWithDetails } from './vault-datastore.service'

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name)

  constructor(
    @Inject(VaultClientService) private readonly vaultClientService: VaultClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  async getProjectValues(projectId: string): Promise<Record<string, any>> {
    const path = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectId}`
      : projectId
    const secret = await this.vaultClientService.read(path)
    return secret?.data || {}
  }

  async read(path: string): Promise<VaultSecret | null> {
    return await this.vaultClientService.read(path)
  }

  async write(data: any, path: string): Promise<void> {
    await this.vaultClientService.write(data, path)
  }

  async destroy(path: string): Promise<void> {
    await this.vaultClientService.destroy(path)
  }

  async upsertMount(kvName: string) {
    const body = {
      type: 'kv',
      config: {
        force_no_cache: true,
      },
      options: {
        version: 2,
      },
    }
    try {
      await this.vaultClientService.updateMount(kvName, body)
    } catch (_error) {
      await this.vaultClientService.createMount(kvName, body)
    }
  }

  async createZone(project: ProjectWithDetails, environment: ProjectWithDetails['environments'][number]) {
    const kvName = generateZoneName(environment.name)
    await this.upsertMount(kvName)
    const techName = generateTechnicalReadOnlyPolicyName(project)
    const appName = generateAppAdminPolicyName(project)
    await Promise.all([
      this.createTechnicalReadOnlyPolicy(techName, project.slug),
      this.createAppAdminPolicy(appName, project.slug),
    ])
    await this.vaultClientService.upsertRole(kvName, [
      techName,
      appName,
    ])
  }

  async createTechnicalReadOnlyPolicy(name: string, projectSlug: string) {
    await this.vaultClientService.upsertPolicyAcl(
      name,
      {
        policy: `path "${projectSlug}/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
      },
    )
  }

  async createAppAdminPolicy(name: string, projectSlug: string) {
    await this.vaultClientService.upsertPolicyAcl(
      name,
      {
        policy:
      `path "${this.config.vaultKvName}/data/${this.config.projectRootPath}/${projectSlug}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
      },
    )
  }
}
