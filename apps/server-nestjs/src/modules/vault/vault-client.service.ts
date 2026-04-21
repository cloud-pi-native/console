import type { VaultFetchOptions } from './vault-http-client.service'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { VaultError, VaultHttpClientService } from './vault-http-client.service'
import { generateGitlabMirrorCredPath, generateProjectPath, generateTechReadOnlyCredPath } from './vault.utils'

interface VaultSysPoliciesAclUpsertRequest {
  policy: string
}

interface VaultSysMountCreateRequest {
  type: string
  config: {
    force_no_cache: boolean
  }
  options: {
    version: number
  }
}

interface VaultSysMountTuneRequest {
  options: {
    version: number
  }
}

interface VaultAuthApproleRoleUpsertRequest {
  secret_id_num_uses: string
  secret_id_ttl: string
  token_max_ttl: string
  token_num_uses: string
  token_ttl: string
  token_type: string
  token_policies: string[]
}

interface VaultIdentityGroupUpsertRequest {
  name: string
  type: string
  policies: string[]
}

interface VaultIdentityGroupAliasCreateRequest {
  name: string
  mount_accessor: string
  canonical_id: string
}

interface VaultAuthMethod {
  accessor: string
  type: string
  description?: string
}

interface VaultSysAuthResponse {
  data: Record<string, VaultAuthMethod>
}

interface VaultIdentityGroupResponse {
  data: {
    id: string
    name: string
    alias?: {
      id?: string
      name?: string
    }
  }
}

export interface VaultMetadata {
  created_time: string
  custom_metadata: Record<string, any> | null
  deletion_time: string
  destroyed: boolean
  version: number
}

export interface VaultSecret<T = any> {
  data: T
  metadata: VaultMetadata
}

export interface VaultResponse<T = any> {
  data: VaultSecret<T>
}

interface VaultListResponse {
  data: {
    keys: string[]
  }
}

interface VaultRoleIdResponse {
  data: {
    role_id: string
  }
}

interface VaultSecretIdResponse {
  data: {
    secret_id: string
  }
}

@Injectable()
export class VaultClientService {
  private readonly logger = new Logger(VaultClientService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(VaultHttpClientService) private readonly http: VaultHttpClientService,
  ) {
  }

  @StartActiveSpan()
  async getKvData<T = any>(kvName: string, path: string): Promise<VaultSecret<T>> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', kvName)
    span?.setAttribute('vault.kv.path', path)
    this.logger.verbose(`Reading Vault KV data (kvName=${kvName}, path=${path})`)
    const response = await this.http.fetch<VaultResponse<T>>(`${kvName}/data/${path}`)
    if (!response?.data) {
      throw new VaultError('InvalidResponse', 'Missing "data" field', { method: 'GET', path: `${kvName}/data/${path}` })
    }
    return response.data
  }

  @StartActiveSpan()
  async upsertKvData<T = any>(kvName: string, path: string, body: { data: T }): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', kvName)
    span?.setAttribute('vault.kv.path', path)
    this.logger.verbose(`Writing Vault KV data (kvName=${kvName}, path=${path})`)
    await this.http.fetch(`${kvName}/data/${path}`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async read<T = any>(path: string): Promise<VaultSecret<T>> {
    this.logger.debug(`Reading Vault KV secret at ${path}`)
    return await this.getKvData<T>(this.config.vaultKvName, path)
  }

  @StartActiveSpan()
  async write<T = any>(data: T, path: string): Promise<void> {
    this.logger.debug(`Writing Vault KV secret at ${path}`)
    await this.upsertKvData(this.config.vaultKvName, path, { data })
  }

  @StartActiveSpan()
  async delete(path: string): Promise<void> {
    this.logger.debug(`Deleting Vault KV secret at ${path}`)
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.path', path)
    return await this.deleteKvMetadata(this.config.vaultKvName, path)
  }

  @StartActiveSpan()
  async readProjectValues(projectId: string): Promise<Record<string, any> | undefined> {
    const path = generateProjectPath(this.config.projectRootDir, projectId)
    this.logger.debug(`Reading Vault project values (projectId=${projectId}, path=${path})`)
    this.logger.verbose(`Reading Vault project values for projectId=${projectId}`)
    const secret = await this.read<Record<string, any>>(path).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
    return secret?.data
  }

  @StartActiveSpan()
  async readGitlabMirrorCreds(projectSlug: string, repoName: string): Promise<VaultSecret | null> {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.config.projectRootDir, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'repo.name': repoName,
      'vault.kv.path': vaultCredsPath,
    })
    this.logger.verbose(`Reading Vault GitLab mirror credentials (projectSlug=${projectSlug}, repoName=${repoName})`)
    return await this.read(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeGitlabMirrorCreds(projectSlug: string, repoName: string, data: Record<string, any>): Promise<void> {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.config.projectRootDir, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'repo.name': repoName,
      'vault.kv.path': vaultCredsPath,
    })
    this.logger.verbose(`Writing Vault GitLab mirror credentials (projectSlug=${projectSlug}, repoName=${repoName})`)
    await this.write(data, vaultCredsPath)
  }

  @StartActiveSpan()
  async deleteGitlabMirrorCreds(projectSlug: string, repoName: string): Promise<void> {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.config.projectRootDir, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'repo.name': repoName,
      'vault.kv.path': vaultCredsPath,
    })
    this.logger.verbose(`Deleting Vault GitLab mirror credentials (projectSlug=${projectSlug}, repoName=${repoName})`)
    await this.delete(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    })
  }

  @StartActiveSpan()
  async readTechnReadOnlyCreds(projectSlug: string): Promise<VaultSecret | null> {
    const vaultPath = generateTechReadOnlyCredPath(this.config.projectRootDir, projectSlug)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'vault.kv.path': vaultPath,
    })
    return await this.read(vaultPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeTechReadOnlyCreds(projectSlug: string, creds: Record<string, any>): Promise<void> {
    const vaultPath = generateTechReadOnlyCredPath(this.config.projectRootDir, projectSlug)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'vault.kv.path': vaultPath,
    })
    await this.write(creds, vaultPath)
  }

  @StartActiveSpan()
  async writeMirrorTriggerToken(secret: Record<string, any>): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.path', 'GITLAB')
    await this.write(secret, 'GITLAB')
  }

  @StartActiveSpan()
  async deleteKvMetadata(kvName: string, path: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', kvName)
    span?.setAttribute('vault.kv.path', path)
    try {
      await this.http.fetch(`${kvName}/metadata/${path}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    }
  }

  @StartActiveSpan()
  async listKvMetadata(kvName: string, path: string): Promise<string[]> {
    try {
      const span = trace.getActiveSpan()
      span?.setAttribute('vault.kv.name', kvName)
      span?.setAttribute('vault.kv.path', path)
      this.logger.verbose(`Listing Vault KV metadata (kvName=${kvName}, path=${path})`)
      const response = await this.http.fetch<VaultListResponse>(`${kvName}/metadata/${path}`, { method: 'LIST' })
      if (!response?.data?.keys) {
        throw new VaultError('InvalidResponse', 'Missing "data.keys" field', { method: 'LIST', path: `${kvName}/metadata/${path}` })
      }
      return response.data.keys
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return []
      throw error
    }
  }

  @StartActiveSpan()
  async upsertSysPoliciesAcl(policyName: string, body: VaultSysPoliciesAclUpsertRequest): Promise<void> {
    this.logger.verbose(`Upserting Vault ACL policy ${policyName}`)
    await this.http.fetch(`sys/policies/acl/${policyName}`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSysPoliciesAcl(policyName: string): Promise<void> {
    this.logger.verbose(`Deleting Vault ACL policy ${policyName}`)
    await this.http.fetch(`sys/policies/acl/${policyName}`, { method: 'DELETE' })
  }

  @StartActiveSpan()
  async createSysMount(name: string, body: VaultSysMountCreateRequest): Promise<void> {
    this.logger.verbose(`Creating Vault mount ${name} (version=${body.options.version})`)
    await this.http.fetch(`sys/mounts/${name}`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async tuneSysMount(name: string, body: VaultSysMountTuneRequest): Promise<void> {
    this.logger.verbose(`Tuning Vault mount ${name} (version=${body.options.version})`)
    await this.http.fetch(`sys/mounts/${name}/tune`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSysMounts(name: string): Promise<void> {
    this.logger.verbose(`Deleting Vault mount ${name}`)
    await this.http.fetch(`sys/mounts/${name}`, { method: 'DELETE' })
  }

  @StartActiveSpan()
  async upsertAuthApproleRole(roleName: string, body: VaultAuthApproleRoleUpsertRequest): Promise<void> {
    this.logger.verbose(`Upserting Vault AppRole ${roleName} (policies=${body.token_policies.length})`)
    await this.http.fetch(`auth/approle/role/${roleName}`, {
      method: 'POST',
      body,
    })
  }

  @StartActiveSpan()
  async deleteAuthApproleRole(roleName: string): Promise<void> {
    this.logger.verbose(`Deleting Vault AppRole ${roleName}`)
    await this.http.fetch(`auth/approle/role/${roleName}`, { method: 'DELETE' })
  }

  async getAuthApproleRoleRoleId(roleName: string): Promise<string> {
    const path = `auth/approle/role/${roleName}/role-id`
    this.logger.verbose(`Reading Vault AppRole role-id for ${roleName}`)
    const response = await this.http.fetch<VaultRoleIdResponse>(path)
    const roleId = response?.data?.role_id
    if (!roleId) {
      throw new VaultError('InvalidResponse', `Vault role-id not found for role ${roleName}`, { method: 'GET', path })
    }
    return roleId
  }

  @StartActiveSpan()
  async createAuthApproleRoleSecretId(roleName: string): Promise<string> {
    const path = `auth/approle/role/${roleName}/secret-id`
    this.logger.verbose(`Creating Vault AppRole secret-id for ${roleName}`)
    const response = await this.http.fetch<VaultSecretIdResponse>(path, { method: 'POST' })
    const secretId = response?.data?.secret_id
    if (!secretId) {
      throw new VaultError('InvalidResponse', `Vault secret-id not generated for role ${roleName}`, { method: 'POST', path })
    }
    return secretId
  }

  async getSysAuth(): Promise<Record<string, VaultAuthMethod>> {
    const path = 'sys/auth'
    this.logger.verbose('Listing Vault auth methods')
    const response = await this.http.fetch<VaultSysAuthResponse>(path)
    return response?.data ?? {}
  }

  @StartActiveSpan()
  async upsertIdentityGroupName(groupName: string, body: VaultIdentityGroupUpsertRequest): Promise<void> {
    this.logger.verbose(`Upserting Vault identity group ${groupName} (policies=${body.policies.length})`)
    await this.http.fetch(`identity/group/name/${groupName}`, {
      method: 'POST',
      body,
    })
  }

  @StartActiveSpan()
  async getIdentityGroupName(groupName: string): Promise<VaultIdentityGroupResponse> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.identity.group.name', groupName)
    const path = `identity/group/name/${groupName}`
    const response = await this.http.fetch<VaultIdentityGroupResponse>(path)
    if (!response) throw new VaultError('InvalidResponse', 'Empty response', { method: 'GET', path })
    return response
  }

  @StartActiveSpan()
  async deleteIdentityGroupName(groupName: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.identity.group.name', groupName)
    this.logger.verbose(`Deleting Vault identity group ${groupName}`)
    await this.http.fetch(`identity/group/name/${groupName}`, { method: 'DELETE' })
  }

  @StartActiveSpan()
  async createIdentityGroupAlias(body: VaultIdentityGroupAliasCreateRequest): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.identity.group.alias', body.name)
    this.logger.verbose(`Creating Vault identity group alias (aliasName=${body.name}, canonicalId=${body.canonical_id})`)
    await this.http.fetch('identity/group-alias', { method: 'POST', body })
  }
}
