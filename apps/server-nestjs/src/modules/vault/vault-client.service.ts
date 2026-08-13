import type { ConfigType } from '@nestjs/config'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { baseConfigFactory } from '../../config/base.config'
import { vaultConfigFactory } from '../../config/vault.config'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { VaultError, VaultHttpClientService } from './vault-http-client.service'
import { generateGitlabMirrorCredPath, generateSecretGroupPath, generateSonarqubeCredPath, generateTechReadOnlyCredPath } from './vault.utils'

export interface VaultSysPoliciesAclUpsertRequest {
  policy: string
}

export interface VaultSysMountCreateRequest {
  type: string
  config: {
    force_no_cache: boolean
  }
  options: {
    version: number
  }
}

export interface VaultSysMountTuneRequest {
  options: {
    version: number
  }
}

export interface VaultAuthApproleRoleUpsertRequest {
  secret_id_num_uses: string
  secret_id_ttl: string
  token_max_ttl: string
  token_num_uses: string
  token_ttl: string
  token_type: string
  token_policies: string[]
}

export interface VaultIdentityGroupUpsertRequest {
  name: string
  type: string
  policies: string[]
}

export interface VaultIdentityGroupAliasCreateRequest {
  name: string
  mount_accessor: string
  canonical_id: string
}

export interface VaultAuthMethod {
  accessor: string
  type: string
  description?: string
}

export interface VaultSysAuthResponse {
  data: Record<string, VaultAuthMethod>
}

export interface VaultIdentityGroupResponse {
  data: {
    id: string
    name: string
    alias?: {
      id?: string
      name?: string
    }
  }
}

export interface SonarqubeUserSecret {
  SONAR_USERNAME: string
  SONAR_PASSWORD: string
  SONAR_TOKEN: string
}

export interface MirrorUserSecret {
  MIRROR_USER: string
  MIRROR_TOKEN: string
}

export interface GitlabMirrorSecret {
  GIT_INPUT_URL: string
  GIT_INPUT_USER: string
  GIT_INPUT_PASSWORD: string
  GIT_OUTPUT_URL: string
  GIT_OUTPUT_USER: string
  GIT_OUTPUT_PASSWORD: string
}

export interface GitlabMirrorGroupSecret {
  PROJECT_SLUG: string
  GIT_MIRROR_PROJECT_ID: string
  GIT_MIRROR_TOKEN: string
}

export type RegistryGroupSecret = Record<string, string>
export type NexusGroupSecret = Record<string, string>

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

export interface VaultListResponse {
  data: {
    keys: string[]
  }
}

export interface VaultRoleIdResponse {
  data: {
    role_id: string
  }
}

export interface VaultSecretIdResponse {
  data: {
    secret_id: string
  }
}

@Injectable()
export class VaultClientService {
  private readonly logger = new Logger(VaultClientService.name)

  constructor(
    @Inject(vaultConfigFactory.KEY) private readonly vaultConfig: ConfigType<typeof vaultConfigFactory>,
    @Inject(baseConfigFactory.KEY) private readonly baseConfig: ConfigType<typeof baseConfigFactory>,
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
    return await this.getKvData<T>(this.vaultConfig.kvName, path)
  }

  @StartActiveSpan()
  async readGitlabSecrets(projectSlug: string): Promise<Record<string, any>> {
    const fullPath = generateSecretGroupPath(this.baseConfig.projectsRootDir, projectSlug, 'GITLAB')
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kv.path', fullPath)
    const secret = await this.read<Record<string, any>>(fullPath).catch(() => null)
    return secret?.data ?? {}
  }

  @StartActiveSpan()
  async readRegistrySecrets(projectSlug: string): Promise<Record<string, any>> {
    const fullPath = generateSecretGroupPath(this.baseConfig.projectsRootDir, projectSlug, 'REGISTRY')
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kv.path', fullPath)
    const secret = await this.read<Record<string, any>>(fullPath).catch(() => null)
    return secret?.data ?? {}
  }

  @StartActiveSpan()
  async write<T = any>(data: T, path: string): Promise<void> {
    this.logger.debug(`Writing Vault KV secret at ${path}`)
    await this.upsertKvData(this.vaultConfig.kvName, path, { data })
  }

  @StartActiveSpan()
  async delete(path: string): Promise<void> {
    this.logger.debug(`Deleting Vault KV secret at ${path}`)
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.path', path)
    return await this.deleteKvMetadata(this.vaultConfig.kvName, path)
  }

  @StartActiveSpan()
  async readGitlabMirrorCreds(projectSlug: string, repoName: string): Promise<VaultSecret<Partial<GitlabMirrorSecret>> | null> {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.baseConfig.projectsRootDir, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('repo.name', repoName)
    span?.setAttribute('vault.kv.path', vaultCredsPath)
    this.logger.verbose(`Reading Vault GitLab mirror credentials (projectSlug=${projectSlug}, repoName=${repoName})`)
    return await this.read<Partial<GitlabMirrorSecret>>(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeGitlabMirrorCreds(projectSlug: string, repoName: string, creds: Partial<GitlabMirrorSecret>): Promise<void> {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.baseConfig.projectsRootDir, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('repo.name', repoName)
    span?.setAttribute('vault.kv.path', vaultCredsPath)
    this.logger.verbose(`Writing Vault GitLab mirror credentials (projectSlug=${projectSlug}, repoName=${repoName})`)
    await this.write(creds, vaultCredsPath)
  }

  @StartActiveSpan()
  async deleteGitlabMirrorCreds(projectSlug: string, repoName: string): Promise<void> {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.baseConfig.projectsRootDir, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('repo.name', repoName)
    span?.setAttribute('vault.kv.path', vaultCredsPath)
    this.logger.verbose(`Deleting Vault GitLab mirror credentials (projectSlug=${projectSlug}, repoName=${repoName})`)
    await this.delete(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    })
  }

  @StartActiveSpan()
  async readTechnReadOnlyCreds(projectSlug: string): Promise<VaultSecret<MirrorUserSecret> | null> {
    const vaultPath = generateTechReadOnlyCredPath(this.baseConfig.projectsRootDir, projectSlug)
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kv.path', vaultPath)
    return await this.read(vaultPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeTechReadOnlyCreds(projectSlug: string, creds: MirrorUserSecret): Promise<void> {
    const vaultPath = generateTechReadOnlyCredPath(this.baseConfig.projectsRootDir, projectSlug)
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kv.path', vaultPath)
    await this.write(creds, vaultPath)
  }

  @StartActiveSpan()
  async readSonarqubeUser(projectSlug: string): Promise<VaultSecret<SonarqubeUserSecret> | null> {
    const vaultPath = generateSonarqubeCredPath(this.baseConfig.projectsRootDir, projectSlug)
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kv.path', vaultPath)
    this.logger.verbose(`Reading Vault SonarQube user credentials (projectSlug=${projectSlug})`)
    return await this.read<SonarqubeUserSecret>(vaultPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeSonarqubeUser(projectSlug: string, secret: SonarqubeUserSecret): Promise<void> {
    const vaultPath = generateSonarqubeCredPath(this.baseConfig.projectsRootDir, projectSlug)
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kv.path', vaultPath)
    this.logger.verbose(`Writing Vault SonarQube user credentials (projectSlug=${projectSlug})`)
    await this.write(secret, vaultPath)
  }

  @StartActiveSpan()
  async deleteSonarqubeUser(projectSlug: string): Promise<void> {
    const vaultPath = generateSonarqubeCredPath(this.baseConfig.projectsRootDir, projectSlug)
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kv.path', vaultPath)
    this.logger.verbose(`Deleting Vault SonarQube user credentials (projectSlug=${projectSlug})`)
    await this.delete(vaultPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    })
  }

  @StartActiveSpan()
  async writeMirrorTriggerToken(projectSlug: string, secret: Record<string, any>): Promise<void> {
    const vaultPath = generateSecretGroupPath(this.baseConfig.projectsRootDir, projectSlug, 'GITLAB')
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', projectSlug)
    span?.setAttribute('vault.kv.path', vaultPath)
    this.logger.verbose(`Writing Vault GitLab mirror trigger token (projectSlug=${projectSlug})`)
    await this.write(secret, vaultPath)
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

  async getAuthApproleRoleRoleId(roleName: string) {
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
  async createAuthApproleRoleSecretId(roleName: string) {
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
    this.logger.verbose('Listing Vault auth methods')
    const response = await this.http.fetch<VaultSysAuthResponse>('sys/auth')
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
