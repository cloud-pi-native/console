import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { trace } from '@opentelemetry/api'
import z from 'zod'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'

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

  private createRequest(path: string, method: string, body?: any): Request {
    const url = new URL(path, this.baseUrl).toString()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Vault-Token': this.token,
    }

    return new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
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
  async destroy(path: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.path', path)
    return await this.deleteKvMetadata(this.config.vaultKvName, path)
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
  async upsertSysPoliciesAcl(policyName: string, body: any): Promise<void> {
    await this.fetch(`/v1/sys/policies/acl/${policyName}`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSysPoliciesAcl(policyName: string): Promise<void> {
    await this.fetch(`/v1/sys/policies/acl/${policyName}`, { method: 'DELETE' })
  }

  @StartActiveSpan()
  async createSysMount(name: string, body: any): Promise<void> {
    await this.fetch(`/v1/sys/mounts/${name}`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async tuneSysMount(name: string, body: any): Promise<void> {
    await this.fetch(`/v1/sys/mounts/${name}/tune`, { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSysMounts(name: string): Promise<void> {
    await this.fetch(`/v1/sys/mounts/${name}`, { method: 'DELETE' })
  }

  @StartActiveSpan()
  async upsertAuthApproleRole(roleName: string, body: any): Promise<void> {
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
  async upsertIdentityGroupName(groupName: string, body: any): Promise<void> {
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
  async createIdentityGroupAlias(body: any): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.identity.group.alias', body?.name)
    await this.fetch('/v1/identity/group-alias', { method: 'POST', body })
  }
}
