import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import type { VaultSecret } from './vault-client.service'
import { generateAppAdminPolicyName, generateTechnicalReadOnlyPolicyName, generateZoneName } from './vault.utils'
import type { ProjectWithDetails } from './vault-datastore.service'

@Injectable()
export class VaultService {
  constructor(
    @Inject(VaultClientService) private readonly vaultClientService: VaultClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  async destroy(path: string): Promise<void> {
    await this.vaultClientService.destroy(path)
  }

  async readProjectValues(projectId: string): Promise<Record<string, any>> {
    const path = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectId}`
      : projectId
    const secret = await this.vaultClientService.read(path)
    return secret?.data || {}
  }

  async readGitlabMirrorCreds(projectSlug: string, repoName: string) {
    const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
    return this.read(vaultCredsPath)
  }

  async writeGitlabMirrorCreds(projectSlug: string, repoName: string, data: Record<string, any>) {
    const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
    return this.write(data, vaultCredsPath)
  }

  async deleteGitlabMirrorCreds(projectSlug: string, repoName: string) {
    const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
    return this.destroy(vaultCredsPath)
  }

  async readMirrorCreds(projectSlug: string) {
    const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
    return this.read(vaultPath)
  }

  async writeMirrorCreds(projectSlug: string, creds: Record<string, any>) {
    const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
    return this.write(creds, vaultPath)
  }

  async writeMirrorTriggerToken(secret: Record<string, any>) {
    return this.write(secret, 'GITLAB')
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
