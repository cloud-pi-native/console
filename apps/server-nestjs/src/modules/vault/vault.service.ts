import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import type { VaultSecret } from './vault-client.service'
import {
  generateAppAdminPolicyName,
  generateTechnicalReadOnlyPolicyName,
  generateZoneName,
  generateZoneTechnicalReadOnlyPolicyName,
} from './vault.utils'
import type { ProjectWithDetails } from './vault-datastore.service'

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name)

  constructor(
    @Inject(VaultClientService) private readonly vaultClientService: VaultClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
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

  async readProjectMirrorCreds(projectSlug: string) {
    const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
    return this.read(vaultPath)
  }

  async writeProjectMirrorCreds(projectSlug: string, creds: Record<string, any>) {
    const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
    return this.write(creds, vaultPath)
  }

  async writeMirrorTriggerToken(secret: Record<string, any>) {
    return this.write(secret, 'GITLAB')
  }

  private async upsertMount(kvName: string) {
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
      await this.vaultClientService.createMount(kvName, body)
    } catch (_error) {
      await this.vaultClientService.updateMount(kvName, body)
    }
  }

  private async deleteMount(kvName: string) {
    await this.vaultClientService.deleteMount(kvName)
  }

  async upsertZone(zoneName: string) {
    const kvName = generateZoneName(zoneName)
    const policyName = generateZoneTechnicalReadOnlyPolicyName(zoneName)
    const roleName = kvName

    await this.upsertMount(kvName)
    await this.vaultClientService.upsertPolicyAcl(policyName, {
      policy: `path "${kvName}/*" { capabilities = ["read"] }`,
    })
    await this.vaultClientService.upsertRole(roleName, [policyName])
  }

  async deleteZone(zoneName: string) {
    const kvName = generateZoneName(zoneName)
    const policyName = generateZoneTechnicalReadOnlyPolicyName(zoneName)
    const roleName = kvName

    await Promise.allSettled([
      this.deleteMount(kvName),
      this.vaultClientService.deletePolicyAcl(policyName),
      this.vaultClientService.deleteRole(roleName),
    ])
  }

  async upsertProject(project: ProjectWithDetails) {
    const kvName = project.slug
    const appPolicyName = generateAppAdminPolicyName(project)
    const techPolicyName = generateTechnicalReadOnlyPolicyName(project)
    const roleName = project.slug
    const groupName = project.slug

    await this.upsertMount(kvName)

    await Promise.all([
      this.createAppAdminPolicy(appPolicyName, project.slug),
      this.createTechnicalReadOnlyPolicy(techPolicyName, project.slug),
      this.ensureProjectGroup(groupName, appPolicyName),
      this.vaultClientService.upsertRole(roleName, [
        techPolicyName,
        appPolicyName,
      ]),
    ])
  }

  async deleteProject(projectSlug: string) {
    const kvName = projectSlug
    const appPolicyName = generateAppAdminPolicyName({ slug: projectSlug } as ProjectWithDetails)
    const techPolicyName = generateTechnicalReadOnlyPolicyName({ slug: projectSlug } as ProjectWithDetails)
    const roleName = projectSlug
    const groupName = projectSlug

    await Promise.allSettled([
      this.deleteMount(kvName),
      this.vaultClientService.deletePolicyAcl(appPolicyName),
      this.vaultClientService.deletePolicyAcl(techPolicyName),
      this.vaultClientService.deleteRole(roleName),
      this.vaultClientService.deleteIdentityGroup(groupName),
    ])
  }

  private async ensureProjectGroup(groupName: string, policyName: string) {
    await this.vaultClientService.upsertIdentityGroup(groupName, [policyName])
    const group = await this.vaultClientService.getIdentityGroup(groupName)
    if (!group?.data?.id) {
      throw new Error(`Vault group not found after upsert: ${groupName}`)
    }

    const groupAliasName = `/${groupName}`
    if (group.data.alias?.name === groupAliasName) return

    const methods = await this.vaultClientService.getAuthMethods()
    const oidc = methods['oidc/']
    if (!oidc?.accessor) {
      throw new Error('Vault OIDC auth method not found (expected "oidc/")')
    }
    await this.vaultClientService.createGroupAlias(groupAliasName, oidc.accessor, group.data.id)
  }

  async createAppAdminPolicy(name: string, projectSlug: string) {
    await this.vaultClientService.upsertPolicyAcl(
      name,
      {
        policy: `path "${projectSlug}/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
      },
    )
  }

  async createTechnicalReadOnlyPolicy(name: string, projectSlug: string) {
    const projectPath = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectSlug}`
      : projectSlug

    await this.vaultClientService.upsertPolicyAcl(
      name,
      {
        policy: `path "${this.config.vaultKvName}/data/${projectPath}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
      },
    )
  }

  async listProjectSecrets(projectSlug: string): Promise<string[]> {
    const projectPath = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectSlug}`
      : projectSlug
    return this.listRecursive(this.config.vaultKvName, projectPath, '')
  }

  async destroyProjectSecrets(projectSlug: string) {
    const secrets = await this.listProjectSecrets(projectSlug)
    await Promise.allSettled(secrets.map(async (relativePath) => {
      const fullPath = this.config.projectRootPath
        ? `${this.config.projectRootPath}/${projectSlug}/${relativePath}`
        : `${projectSlug}/${relativePath}`
      await this.destroy(fullPath)
    }))
  }

  private async listRecursive(kvName: string, basePath: string, relativePath: string): Promise<string[]> {
    const combined = relativePath.length === 0 ? basePath : `${basePath}/${relativePath}`
    const keys = await this.vaultClientService.listInKv(kvName, combined)
    if (!keys || keys.length === 0) return []

    const results: string[] = []
    for (const key of keys) {
      if (key.endsWith('/')) {
        const nestedRel = relativePath.length === 0 ? key.slice(0, -1) : `${relativePath}/${key.slice(0, -1)}`
        const nested = await this.listRecursive(kvName, basePath, nestedRel)
        results.push(...nested)
      } else {
        results.push(relativePath.length === 0 ? key : `${relativePath}/${key}`)
      }
    }
    return results
  }
}
