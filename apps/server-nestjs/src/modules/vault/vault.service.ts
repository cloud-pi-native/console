import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService, VaultError } from './vault-client.service'
import type { VaultSecret } from './vault-client.service'
import { trace } from '@opentelemetry/api'
import {
  generateAppAdminPolicyName,
  generateTechReadOnlyPolicyName,
  generateZoneName,
  generateZoneTechReadOnlyPolicyName,
} from './vault.utils'
import type { ProjectWithDetails } from './vault-datastore.service'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'

@Injectable()
export class VaultService {
  constructor(
    @Inject(VaultClientService) private readonly vaultClientService: VaultClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  private getApproleRoleBody(policies: string[]) {
    return {
      secret_id_num_uses: '0',
      secret_id_ttl: '0',
      token_max_ttl: '0',
      token_num_uses: '0',
      token_ttl: '0',
      token_type: 'batch',
      token_policies: policies,
    }
  }

  @StartActiveSpan()
  async read(path: string): Promise<VaultSecret> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.path', path)
    return await this.vaultClientService.getKvData(this.config.vaultKvName, path)
  }

  @StartActiveSpan()
  async write(data: any, path: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.path', path)
    await this.vaultClientService.upsertKvData(this.config.vaultKvName, path, { data })
  }

  @StartActiveSpan()
  async destroy(path: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.path', path)
    await this.vaultClientService.destroy(path)
  }

  @StartActiveSpan()
  async readProjectValues(projectId: string): Promise<Record<string, any>> {
    const span = trace.getActiveSpan()
    const path = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectId}`
      : projectId
    span?.setAttribute('vault.path', path)
    const secret = await this.vaultClientService.getKvData(this.config.vaultKvName, path)
      .catch((error) => {
        if (error instanceof VaultError && error.kind === 'NotFound') return null
        throw error
      })
    return secret?.data
  }

  @StartActiveSpan()
  async readGitlabMirrorCreds(projectSlug: string, repoName: string) {
    const span = trace.getActiveSpan()
    const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
    span?.setAttribute('vault.path', vaultCredsPath)
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('repo.name', repoName)
    return await this.read(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeGitlabMirrorCreds(projectSlug: string, repoName: string, data: Record<string, any>) {
    const span = trace.getActiveSpan()
    const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
    span?.setAttribute('vault.path', vaultCredsPath)
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('repo.name', repoName)
    await this.write(data, vaultCredsPath)
  }

  @StartActiveSpan()
  async deleteGitlabMirrorCreds(projectSlug: string, repoName: string) {
    const span = trace.getActiveSpan()
    const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
    span?.setAttribute('vault.path', vaultCredsPath)
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('repo.name', repoName)
    await this.destroy(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    })
  }

  @StartActiveSpan()
  async readTechnReadOnlyCreds(projectSlug: string) {
    const span = trace.getActiveSpan()
    const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
    span?.setAttribute('vault.path', vaultPath)
    span?.setAttribute('project.slug', projectSlug)
    return await this.read(vaultPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeTechReadOnlyCreds(projectSlug: string, creds: Record<string, any>) {
    const span = trace.getActiveSpan()
    const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
    span?.setAttribute('vault.path', vaultPath)
    span?.setAttribute('project.slug', projectSlug)
    await this.write(creds, vaultPath)
  }

  @StartActiveSpan()
  async writeMirrorTriggerToken(secret: Record<string, any>) {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.path', 'GITLAB')
    await this.write(secret, 'GITLAB')
  }

  private async upsertMount(kvName: string): Promise<void> {
    const createBody = {
      type: 'kv',
      config: {
        force_no_cache: true,
      },
      options: {
        version: 2,
      },
    }
    const tuneBody = {
      options: {
        version: 2,
      },
    }
    try {
      await this.vaultClientService.createSysMount(kvName, createBody)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'HttpError' && error.status === 400) {
        await this.vaultClientService.tuneSysMount(kvName, tuneBody)
        return
      }
      throw error
    }
  }

  private async deleteMount(kvName: string): Promise<void> {
    try {
      await this.vaultClientService.deleteSysMounts(kvName)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    }
  }

  @StartActiveSpan()
  async upsertZone(zoneName: string): Promise<void> {
    const span = trace.getActiveSpan()
    const kvName = generateZoneName(zoneName)
    const policyName = generateZoneTechReadOnlyPolicyName(zoneName)

    span?.setAttribute('zone.name', zoneName)
    span?.setAttribute('vault.kvName', kvName)

    await this.upsertMount(kvName)
    await this.vaultClientService.upsertSysPoliciesAcl(policyName, {
      policy: `path "${kvName}/*" { capabilities = ["read"] }`,
    })
    await this.vaultClientService.upsertAuthApproleRole(kvName, this.getApproleRoleBody([policyName]))
  }

  @StartActiveSpan()
  async deleteZone(zoneName: string): Promise<void> {
    const span = trace.getActiveSpan()
    const kvName = generateZoneName(zoneName)
    const policyName = generateZoneTechReadOnlyPolicyName(zoneName)
    const roleName = kvName

    span?.setAttribute('zone.name', zoneName)
    span?.setAttribute('vault.kvName', kvName)

    await this.deleteMount(kvName)

    const settled = await Promise.allSettled([
      this.vaultClientService.deleteSysPoliciesAcl(policyName),
      this.vaultClientService.deleteAuthApproleRole(roleName),
    ])

    for (const result of settled) {
      if (result.status !== 'rejected') continue
      const error = result.reason
      if (error instanceof VaultError && error.kind === 'NotFound') continue
      throw error
    }
  }

  @StartActiveSpan()
  async upsertProject(project: ProjectWithDetails): Promise<void> {
    const span = trace.getActiveSpan()
    const appPolicyName = generateAppAdminPolicyName(project)
    const techPolicyName = generateTechReadOnlyPolicyName(project)
    span?.setAttribute('project.slug', project.slug)
    await this.upsertMount(project.slug)
    await Promise.all([
      this.createAppAdminPolicy(appPolicyName, project.slug),
      this.createTechReadOnlyPolicy(techPolicyName, project.slug),
      this.ensureProjectGroup(project.slug, appPolicyName),
      this.vaultClientService.upsertAuthApproleRole(project.slug, this.getApproleRoleBody([techPolicyName, appPolicyName])),
    ])
  }

  @StartActiveSpan()
  async deleteProject(projectSlug: string): Promise<void> {
    const span = trace.getActiveSpan()
    const appPolicyName = generateAppAdminPolicyName({ slug: projectSlug } as ProjectWithDetails)
    const techPolicyName = generateTechReadOnlyPolicyName({ slug: projectSlug } as ProjectWithDetails)

    span?.setAttribute('project.slug', projectSlug)

    await this.deleteMount(projectSlug)

    const settled = await Promise.allSettled([
      this.vaultClientService.deleteSysPoliciesAcl(appPolicyName),
      this.vaultClientService.deleteSysPoliciesAcl(techPolicyName),
      this.vaultClientService.deleteAuthApproleRole(projectSlug),
      this.vaultClientService.deleteIdentityGroupName(projectSlug),
    ])
    for (const result of settled) {
      if (result.status !== 'rejected') continue
      const error = result.reason
      if (error instanceof VaultError && error.kind === 'NotFound') continue
      throw error
    }
  }

  private async ensureProjectGroup(groupName: string, policyName: string): Promise<void> {
    await this.vaultClientService.upsertIdentityGroupName(groupName, {
      name: groupName,
      type: 'external',
      policies: [policyName],
    })

    const groupResult = await this.vaultClientService.getIdentityGroupName(groupName)
    if (!groupResult.data?.id) {
      throw new VaultError('InvalidResponse', `Vault group not found after upsert: ${groupName}`, { method: 'GET', path: `/v1/identity/group/name/${groupName}` })
    }

    const groupAliasName = `/${groupName}`
    if (groupResult.data.alias?.name === groupAliasName) return

    const methods = await this.vaultClientService.getSysAuth()
    const oidc = methods['oidc/']
    if (!oidc?.accessor) {
      throw new VaultError('InvalidResponse', 'Vault OIDC auth method not found (expected "oidc/")', { method: 'GET', path: '/v1/sys/auth' })
    }
    try {
      await this.vaultClientService.createIdentityGroupAlias({
        name: groupAliasName,
        mount_accessor: oidc.accessor,
        canonical_id: groupResult.data.id,
      })
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'HttpError' && error.status === 400) return
      throw error
    }
  }

  async createAppAdminPolicy(name: string, projectSlug: string): Promise<void> {
    await this.vaultClientService.upsertSysPoliciesAcl(name, {
      policy: `path "${projectSlug}/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
    })
  }

  async createTechReadOnlyPolicy(name: string, projectSlug: string): Promise<void> {
    await this.vaultClientService.upsertSysPoliciesAcl(name, {
      policy: `path "${this.config.vaultKvName}/data/${projectSlug}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
    })
  }

  async listProjectSecrets(projectSlug: string): Promise<string[]> {
    const projectPath = this.config.projectRootPath
      ? `${this.config.projectRootPath}/${projectSlug}`
      : projectSlug
    return this.listRecursive(this.config.vaultKvName, projectPath, '')
  }

  @StartActiveSpan()
  async destroyProjectSecrets(projectSlug: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kvName', projectSlug)
    const secrets = await this.listProjectSecrets(projectSlug)

    await Promise.allSettled(secrets.map(async (relativePath) => {
      const fullPath = this.config.projectRootPath
        ? `${this.config.projectRootPath}/${projectSlug}/${relativePath}`
        : `${projectSlug}/${relativePath}`
      try {
        await this.destroy(fullPath)
      } catch (error) {
        if (error instanceof VaultError && error.kind === 'NotFound') return
        throw error
      }
    }))
  }

  private async listRecursive(
    kvName: string,
    basePath: string,
    relativePath: string,
  ): Promise<string[]> {
    const combined = relativePath.length === 0 ? basePath : `${basePath}/${relativePath}`
    const keys = await this.vaultClientService.listKvMetadata(kvName, combined)
    if (keys.length === 0) return []

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
