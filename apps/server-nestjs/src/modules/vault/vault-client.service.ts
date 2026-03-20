import { Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import z from 'zod'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
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

interface VaultFetchOptions {
  method?: string
  body?: unknown
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

export type VaultErrorKind
  = | 'NotConfigured'
    | 'NotFound'
    | 'HttpError'
    | 'InvalidResponse'
    | 'ParseError'
    | 'Unexpected'

export class VaultError extends Error {
  readonly kind: VaultErrorKind
  readonly status?: number
  readonly method?: string
  readonly path?: string
  readonly statusText?: string
  readonly reasons?: string[]

  constructor(
    kind: VaultErrorKind,
    message: string,
    details: { status?: number, method?: string, path?: string, statusText?: string, reasons?: string[] } = {},
  ) {
    super(message)
    this.name = 'VaultError'
    this.kind = kind
    this.status = details.status
    this.method = details.method
    this.path = details.path
    this.statusText = details.statusText
    this.reasons = details.reasons
  }
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
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  @StartActiveSpan()
  private async fetch<T = any>(
    path: string,
    options: VaultFetchOptions = {},
  ): Promise<T | null> {
    const span = trace.getActiveSpan()
    const method = options.method ?? 'GET'
    span?.setAttribute('vault.method', method)
    span?.setAttribute('vault.path', path)

    const request = this.createRequest(path, method, options.body)
    const response = await fetch(request).catch((error) => {
      throw new VaultError(
        'Unexpected',
        error instanceof Error ? error.message : String(error),
        { method, path },
      )
    })
    span?.setAttribute('vault.http.status', response.status)

    return await this.handleResponse<T>(response, method, path)
  }

  private get baseUrl() {
    if (!this.config.vaultInternalUrl) {
      throw new VaultError('NotConfigured', 'VAULT_INTERNAL_URL is required')
    }
    return this.config.vaultInternalUrl
  }

  private get token() {
    if (!this.config.vaultToken) {
      throw new VaultError('NotConfigured', 'VAULT_TOKEN is required')
    }
    return this.config.vaultToken
  }

  private createRequest(path: string, method: string, body?: unknown): Request {
    const url = new URL(path, this.baseUrl).toString()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Vault-Token': this.token,
    }

    return new Request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  private async handleResponse<T>(response: Response, method: string, path: string): Promise<T | null> {
    if (response.status === 204) return null

    if (!response.ok) {
      await this.throwForStatus(response, method, path)
    }

    return await response.json()
  }

  private async throwForStatus(response: Response, method: string, path: string): Promise<never> {
    const responseBody = await response.json()
    const vaultErrorBody = z.object({ errors: z.array(z.string()) }).safeParse(responseBody)
    const reasons = vaultErrorBody.success ? vaultErrorBody.data.errors : undefined

    if (response.status === 404) {
      throw new VaultError('NotFound', 'Not Found', {
        status: 404,
        method,
        path,
        statusText: response.statusText,
        reasons,
      })
    }

    throw new VaultError('HttpError', 'Request failed', {
      status: response.status,
      method,
      path,
      statusText: response.statusText,
      reasons,
    })
  }

  @StartActiveSpan()
  async getKvData<T = any>(kvName: string, path: string): Promise<VaultSecret<T>> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', kvName)
    span?.setAttribute('vault.kv.path', path)
    const response = await this.fetch<VaultResponse<T>>(`/v1/${kvName}/data/${path}`, { method: 'GET' })
    if (!response?.data) {
      throw new VaultError('InvalidResponse', 'Missing "data" field', { method: 'GET', path: `/v1/${kvName}/data/${path}` })
    }
    return response.data
  }

  @StartActiveSpan()
  async upsertKvData<T = any>(kvName: string, path: string, body: { data: T }): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', kvName)
    span?.setAttribute('vault.kv.path', path)
    await this.fetch(`/v1/${kvName}/data/${path}`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async read<T = any>(path: string): Promise<VaultSecret<T>> {
    return await this.getKvData<T>(this.config.vaultKvName, path)
  }

  @StartActiveSpan()
  async write<T = any>(data: T, path: string): Promise<void> {
    await this.upsertKvData(this.config.vaultKvName, path, { data })
  }

  @StartActiveSpan()
  async delete(path: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.path', path)
    return await this.deleteKvMetadata(this.config.vaultKvName, path)
  }

  @StartActiveSpan()
  async readProjectValues(projectId: string): Promise<Record<string, any> | undefined> {
    const path = generateProjectPath(this.config.projectRootPath, projectId)
    const secret = await this.read<Record<string, any>>(path).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
    return secret?.data
  }

  @StartActiveSpan()
  async readGitlabMirrorCreds(projectSlug: string, repoName: string): Promise<VaultSecret | null> {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.config.projectRootPath, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'repo.name': repoName,
      'vault.kv.path': vaultCredsPath,
    })
    return await this.read(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeGitlabMirrorCreds(projectSlug: string, repoName: string, data: Record<string, any>): Promise<void> {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.config.projectRootPath, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'repo.name': repoName,
      'vault.kv.path': vaultCredsPath,
    })
    await this.write(data, vaultCredsPath)
  }

  @StartActiveSpan()
  async deleteGitlabMirrorCreds(projectSlug: string, repoName: string): Promise<void> {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.config.projectRootPath, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'project.slug': projectSlug,
      'repo.name': repoName,
      'vault.kv.path': vaultCredsPath,
    })
    await this.delete(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    })
  }

  @StartActiveSpan()
  async readTechnReadOnlyCreds(projectSlug: string): Promise<VaultSecret | null> {
    const vaultPath = generateTechReadOnlyCredPath(this.config.projectRootPath, projectSlug)
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
    const vaultPath = generateTechReadOnlyCredPath(this.config.projectRootPath, projectSlug)
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
      await this.fetch(`/v1/${kvName}/metadata/${path}`, { method: 'DELETE' })
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
      const response = await this.fetch<VaultListResponse>(`/v1/${kvName}/metadata/${path}`, { method: 'LIST' })
      if (!response?.data?.keys) {
        throw new VaultError('InvalidResponse', 'Missing "data.keys" field', { method: 'LIST', path: `/v1/${kvName}/metadata/${path}` })
      }
      return response.data.keys
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return []
      throw error
    }
  }

  @StartActiveSpan()
  async upsertSysPoliciesAcl(policyName: string, body: VaultSysPoliciesAclUpsertRequest): Promise<void> {
    await this.fetch(`/v1/sys/policies/acl/${policyName}`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSysPoliciesAcl(policyName: string): Promise<void> {
    await this.fetch(`/v1/sys/policies/acl/${policyName}`, { method: 'DELETE' })
  }

  @StartActiveSpan()
  async createSysMount(name: string, body: VaultSysMountCreateRequest): Promise<void> {
    await this.fetch(`/v1/sys/mounts/${name}`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async tuneSysMount(name: string, body: VaultSysMountTuneRequest): Promise<void> {
    await this.fetch(`/v1/sys/mounts/${name}/tune`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSysMounts(name: string): Promise<void> {
    await this.fetch(`/v1/sys/mounts/${name}`, { method: 'DELETE' })
  }

  @StartActiveSpan()
  async upsertAuthApproleRole(roleName: string, body: VaultAuthApproleRoleUpsertRequest): Promise<void> {
    await this.fetch(`/v1/auth/approle/role/${roleName}`, {
      method: 'POST',
      body,
    })
  }

  @StartActiveSpan()
  async deleteAuthApproleRole(roleName: string): Promise<void> {
    await this.fetch(`/v1/auth/approle/role/${roleName}`, { method: 'DELETE' })
  }

  async getAuthApproleRoleRoleId(roleName: string): Promise<string> {
    const path = `/v1/auth/approle/role/${roleName}/role-id`
    const response = await this.fetch<VaultRoleIdResponse>(path, { method: 'GET' })
    const roleId = response?.data?.role_id
    if (!roleId) {
      throw new VaultError('InvalidResponse', `Vault role-id not found for role ${roleName}`, { method: 'GET', path })
    }
    return roleId
  }

  @StartActiveSpan()
  async createAuthApproleRoleSecretId(roleName: string): Promise<string> {
    const path = `/v1/auth/approle/role/${roleName}/secret-id`
    const response = await this.fetch<VaultSecretIdResponse>(path, { method: 'POST' })
    const secretId = response?.data?.secret_id
    if (!secretId) {
      throw new VaultError('InvalidResponse', `Vault secret-id not generated for role ${roleName}`, { method: 'POST', path })
    }
    return secretId
  }

  async getSysAuth(): Promise<Record<string, VaultAuthMethod>> {
    const path = '/v1/sys/auth'
    const response = await this.fetch<VaultSysAuthResponse>(path, { method: 'GET' })
    return response?.data ?? {}
  }

  @StartActiveSpan()
  async upsertIdentityGroupName(groupName: string, body: VaultIdentityGroupUpsertRequest): Promise<void> {
    await this.fetch(`/v1/identity/group/name/${groupName}`, {
      method: 'POST',
      body,
    })
  }

  @StartActiveSpan()
  async getIdentityGroupName(groupName: string): Promise<VaultIdentityGroupResponse> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.identity.group.name', groupName)
    const path = `/v1/identity/group/name/${groupName}`
    const response = await this.fetch<VaultIdentityGroupResponse>(path, { method: 'GET' })
    if (!response) throw new VaultError('InvalidResponse', 'Empty response', { method: 'GET', path })
    return response
  }

  @StartActiveSpan()
  async deleteIdentityGroupName(groupName: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.identity.group.name', groupName)
    await this.fetch(`/v1/identity/group/name/${groupName}`, { method: 'DELETE' })
  }

  @StartActiveSpan()
  async createIdentityGroupAlias(body: VaultIdentityGroupAliasCreateRequest): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.identity.group.alias', body.name)
    await this.fetch('/v1/identity/group-alias', { method: 'POST', body })
  }
}
