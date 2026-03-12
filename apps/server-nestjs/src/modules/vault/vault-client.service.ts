import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { trace } from '@opentelemetry/api'

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

interface VaultKv1Response<T = any> {
  data: T
}

export type VaultError
  = { kind: 'NotConfigured', message: string }
    | { kind: 'NotFound', status: 404, method: string, path: string, statusText?: string }
    | { kind: 'HttpError', status: number, method: string, path: string, statusText: string }
    | { kind: 'InvalidResponse', message: string, method: string, path: string }
    | { kind: 'ParseError', message: string, method: string, path: string }
    | { kind: 'Unexpected', message: string, method: string, path: string }

export type VaultResult<T>
  = | { data: T, error: null }
    | { data: null, error: VaultError }

const tracer = trace.getTracer('vault-client-service')

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
  ) {
  }

  private deriveAlternateKvFromPath(kvName: string, path: string): { kvName: string, path: string } | null {
    const normalized = path.startsWith('/') ? path.slice(1) : path
    const index = normalized.indexOf('/')
    if (index <= 0) return null

    const candidateKvName = normalized.slice(0, index)
    if (candidateKvName === kvName) return null

    const candidatePath = normalized.slice(index + 1)
    if (candidatePath.length === 0) return null

    return { kvName: candidateKvName, path: candidatePath }
  }

  private async fetch<T = any>(
    path: string,
    options: { method?: string, body?: any } = {},
  ): Promise<VaultResult<T | null>> {
    const method = options.method ?? 'GET'
    return tracer.startActiveSpan('fetch', async (span) => {
      try {
        span.setAttribute('vault.method', method)
        span.setAttribute('vault.path', path)

        if (!this.config.vaultInternalUrl) {
          return {
            data: null,
            error: { kind: 'NotConfigured', message: 'VAULT_INTERNAL_URL is required' },
          } satisfies VaultResult<T | null>
        }
        if (!this.config.vaultToken) {
          return {
            data: null,
            error: { kind: 'NotConfigured', message: 'VAULT_TOKEN is required' },
          } satisfies VaultResult<T | null>
        }

        const url = `${this.config.vaultInternalUrl}${path}`
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Vault-Token': this.config.vaultToken,
        }

        let response: Response
        try {
          response = await fetch(url, {
            method,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
          })
        } catch (error) {
          return {
            data: null,
            error: {
              kind: 'Unexpected',
              message: error instanceof Error ? error.message : String(error),
              method,
              path,
            },
          } satisfies VaultResult<T | null>
        }

        span.setAttribute('vault.http.status', response.status)

        if (response.status === 404) {
          return {
            data: null,
            error: { kind: 'NotFound', status: 404, method, path, statusText: response.statusText },
          } satisfies VaultResult<T | null>
        }
        if (!response.ok) {
          return {
            data: null,
            error: { kind: 'HttpError', status: response.status, statusText: response.statusText, method, path },
          } satisfies VaultResult<T | null>
        }
        if (response.status === 204) {
          return { data: null, error: null } satisfies VaultResult<T | null>
        }

        try {
          return { data: await response.json(), error: null } satisfies VaultResult<T | null>
        } catch (error) {
          return {
            data: null,
            error: {
              kind: 'ParseError',
              message: error instanceof Error ? error.message : String(error),
              method,
              path,
            },
          } satisfies VaultResult<T | null>
        }
      } finally {
        span.end()
      }
    })
  }

  async read<T = any>(path: string): Promise<VaultResult<VaultSecret<T>>> {
    return this.readFromKv(this.config.vaultKvName, path)
  }

  async readFromKv<T = any>(kvName: string, path: string): Promise<VaultResult<VaultSecret<T>>> {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.fetch<VaultResponse<T>>(`/v1/${kvName}/data/${path}`, { method: 'GET' })
    if (response.error) {
      if (response.error.kind === 'NotFound') {
        const alternate = this.deriveAlternateKvFromPath(kvName, path)
        if (alternate) {
          const fallback = await this.fetch<VaultResponse<T>>(`/v1/${alternate.kvName}/data/${alternate.path}`, { method: 'GET' })
          if (!fallback.error && fallback.data?.data) return { data: fallback.data.data, error: null }
          if (fallback.error && fallback.error.kind !== 'NotFound') return { data: null, error: fallback.error }
        }

        const kv1 = await this.fetch<VaultKv1Response<T>>(`/v1/${kvName}/${path}`, { method: 'GET' })
        if (!kv1.error && kv1.data) {
          return {
            data: {
              data: kv1.data.data,
              metadata: {
                created_time: '',
                custom_metadata: null,
                deletion_time: '',
                destroyed: false,
                version: 1,
              },
            },
            error: null,
          }
        }
        if (alternate) {
          const kv1Fallback = await this.fetch<VaultKv1Response<T>>(`/v1/${alternate.kvName}/${alternate.path}`, { method: 'GET' })
          if (!kv1Fallback.error && kv1Fallback.data) {
            return {
              data: {
                data: kv1Fallback.data.data,
                metadata: {
                  created_time: '',
                  custom_metadata: null,
                  deletion_time: '',
                  destroyed: false,
                  version: 1,
                },
              },
              error: null,
            }
          }
          if (kv1Fallback.error) return { data: null, error: kv1Fallback.error }
        }
      }
      if (response.error.kind !== 'NotFound') {
        this.logger.error(`Failed to read vault path ${path}: ${response.error.kind}`)
      }
      return { data: null, error: response.error }
    }
    if (!response.data?.data) {
      return {
        data: null,
        error: { kind: 'InvalidResponse', message: 'Missing "data" field', method: 'GET', path: `/v1/${kvName}/data/${path}` },
      }
    }
    return { data: response.data.data, error: null }
  }

  async write<T = any>(data: T, path: string): Promise<VaultResult<void>> {
    return this.writeToKv(this.config.vaultKvName, data, path)
  }

  async writeToKv<T = any>(kvName: string, data: T, path: string): Promise<VaultResult<void>> {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.fetch(`/v1/${kvName}/data/${path}`, { method: 'POST', body: { data } })
    if (response.error) {
      if (response.error.kind === 'NotFound') {
        const alternate = this.deriveAlternateKvFromPath(kvName, path)
        if (alternate) {
          const fallback = await this.fetch(`/v1/${alternate.kvName}/data/${alternate.path}`, { method: 'POST', body: { data } })
          if (!fallback.error) return { data: undefined, error: null }
          if (fallback.error.kind !== 'NotFound') return { data: null, error: fallback.error }
        }

        const kv1 = await this.fetch(`/v1/${kvName}/${path}`, { method: 'POST', body: data })
        if (!kv1.error) return { data: undefined, error: null }
        if (kv1.error.kind !== 'NotFound') return { data: null, error: kv1.error }

        if (alternate) {
          const kv1Fallback = await this.fetch(`/v1/${alternate.kvName}/${alternate.path}`, { method: 'POST', body: data })
          if (!kv1Fallback.error) return { data: undefined, error: null }
          if (kv1Fallback.error.kind !== 'NotFound') return { data: null, error: kv1Fallback.error }
        }
      }
      this.logger.error(`Failed to write vault path ${path}: ${response.error.kind}`)
      return { data: null, error: response.error }
    }
    return { data: undefined, error: null }
  }

  async destroy(path: string): Promise<VaultResult<void>> {
    return this.destroyInKv(this.config.vaultKvName, path)
  }

  async destroyInKv(kvName: string, path: string): Promise<VaultResult<void>> {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.fetch(`/v1/${kvName}/metadata/${path}`, { method: 'DELETE' })
    if (response.error) {
      if (response.error.kind === 'NotFound') {
        const alternate = this.deriveAlternateKvFromPath(kvName, path)
        if (alternate) {
          const fallback = await this.fetch(`/v1/${alternate.kvName}/metadata/${alternate.path}`, { method: 'DELETE' })
          if (!fallback.error) return { data: undefined, error: null }
          if (fallback.error.kind !== 'NotFound') return { data: null, error: fallback.error }
        }

        const kv1 = await this.fetch(`/v1/${kvName}/${path}`, { method: 'DELETE' })
        if (!kv1.error) return { data: undefined, error: null }
        if (kv1.error.kind !== 'NotFound') return { data: null, error: kv1.error }

        if (alternate) {
          const kv1Fallback = await this.fetch(`/v1/${alternate.kvName}/${alternate.path}`, { method: 'DELETE' })
          if (!kv1Fallback.error) return { data: undefined, error: null }
          if (kv1Fallback.error.kind !== 'NotFound') return { data: null, error: kv1Fallback.error }
        }

        return { data: undefined, error: null }
      }
      this.logger.error(`Failed to destroy vault path ${path}: ${response.error.kind}`)
      return { data: null, error: response.error }
    }
    return { data: undefined, error: null }
  }

  async listInKv(kvName: string, path: string): Promise<VaultResult<string[]>> {
    if (path.startsWith('/')) path = path.slice(1)
    const normalized = path.length === 0 ? '' : path.endsWith('/') ? path : `${path}/`
    const response = await this.fetch<VaultListResponse>(`/v1/${kvName}/metadata/${normalized}`, { method: 'LIST' })
    if (response.error) {
      if (response.error.kind === 'NotFound') {
        const alternate = this.deriveAlternateKvFromPath(kvName, path)
        if (alternate) {
          const fallbackNormalized = alternate.path.length === 0 ? '' : alternate.path.endsWith('/') ? alternate.path : `${alternate.path}/`
          const fallback = await this.fetch<VaultListResponse>(`/v1/${alternate.kvName}/metadata/${fallbackNormalized}`, { method: 'LIST' })
          if (!fallback.error && fallback.data?.data?.keys) return { data: fallback.data.data.keys, error: null }
          if (fallback.error?.kind === 'NotFound') return { data: [], error: null }
          if (fallback.error) return { data: null, error: fallback.error }
        }

        const kv1 = await this.fetch<VaultListResponse>(`/v1/${kvName}/${normalized}`, { method: 'LIST' })
        if (!kv1.error && kv1.data?.data?.keys) return { data: kv1.data.data.keys, error: null }
        if (kv1.error?.kind === 'NotFound') return { data: [], error: null }

        if (alternate) {
          const fallbackNormalized = alternate.path.length === 0 ? '' : alternate.path.endsWith('/') ? alternate.path : `${alternate.path}/`
          const kv1Fallback = await this.fetch<VaultListResponse>(`/v1/${alternate.kvName}/${fallbackNormalized}`, { method: 'LIST' })
          if (!kv1Fallback.error && kv1Fallback.data?.data?.keys) return { data: kv1Fallback.data.data.keys, error: null }
          if (kv1Fallback.error?.kind === 'NotFound') return { data: [], error: null }
          if (kv1Fallback.error) return { data: null, error: kv1Fallback.error }
        }

        return { data: [], error: null }
      }
      return { data: null, error: response.error }
    }
    if (!response.data?.data?.keys) {
      return {
        data: null,
        error: { kind: 'InvalidResponse', message: 'Missing "data.keys" field', method: 'LIST', path: `/v1/${kvName}/metadata/${normalized}` },
      }
    }
    return { data: response.data.data.keys, error: null }
  }

  async upsertPolicyAcl(policyName: string, data: any): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/sys/policies/acl/${policyName}`, { method: 'POST', body: data })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

  async deletePolicyAcl(policyName: string): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/sys/policies/acl/${policyName}`, { method: 'DELETE' })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

  async createMount(name: string, data: any): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/sys/mounts/${name}`, { method: 'POST', body: data })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

  async updateMount(name: string, data: any): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/sys/mounts/${name}/tune`, { method: 'POST', body: data })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

  async deleteMount(name: string): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/sys/mounts/${name}`, { method: 'DELETE' })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

  async upsertRole(roleName: string, policies: string[]): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/auth/approle/role/${roleName}`, {
      method: 'POST',
      body: {
        secret_id_num_uses: '0',
        secret_id_ttl: '0',
        token_max_ttl: '0',
        token_num_uses: '0',
        token_ttl: '0',
        token_type: 'batch',
        token_policies: policies,
      },
    })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

  async deleteRole(roleName: string): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/auth/approle/role/${roleName}`, { method: 'DELETE' })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

  async getRoleId(roleName: string): Promise<VaultResult<string>> {
    const path = `/v1/auth/approle/role/${roleName}/role-id`
    const response = await this.fetch<VaultRoleIdResponse>(path, { method: 'GET' })
    if (response.error) return { data: null, error: response.error }
    const roleId = response.data?.data?.role_id
    if (!roleId) {
      return { data: null, error: { kind: 'InvalidResponse', message: `Vault role-id not found for role ${roleName}`, method: 'GET', path } }
    }
    return { data: roleId, error: null }
  }

  async generateSecretId(roleName: string): Promise<VaultResult<string>> {
    const path = `/v1/auth/approle/role/${roleName}/secret-id`
    const response = await this.fetch<VaultSecretIdResponse>(path, { method: 'POST' })
    if (response.error) return { data: null, error: response.error }
    const secretId = response.data?.data?.secret_id
    if (!secretId) {
      return { data: null, error: { kind: 'InvalidResponse', message: `Vault secret-id not generated for role ${roleName}`, method: 'POST', path } }
    }
    return { data: secretId, error: null }
  }

  async getAuthMethods(): Promise<VaultResult<Record<string, VaultAuthMethod>>> {
    const path = '/v1/sys/auth'
    const response = await this.fetch<VaultSysAuthResponse>(path, { method: 'GET' })
    if (response.error) return { data: null, error: response.error }
    return { data: response.data?.data ?? {}, error: null }
  }

  async upsertIdentityGroup(groupName: string, policies: string[]): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/identity/group/name/${groupName}`, {
      method: 'POST',
      body: {
        name: groupName,
        type: 'external',
        policies,
      },
    })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

  async getIdentityGroup(groupName: string): Promise<VaultResult<VaultIdentityGroupResponse>> {
    const response = await this.fetch<VaultIdentityGroupResponse>(`/v1/identity/group/name/${groupName}`, { method: 'GET' })
    if (response.error) return { data: null, error: response.error }
    if (!response.data) {
      return { data: null, error: { kind: 'InvalidResponse', message: 'Empty response', method: 'GET', path: `/v1/identity/group/name/${groupName}` } }
    }
    return { data: response.data, error: null }
  }

  async deleteIdentityGroup(groupName: string): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/identity/group/name/${groupName}`, { method: 'DELETE' })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

  async createGroupAlias(groupAliasName: string, mountAccessor: string, canonicalId: string): Promise<VaultResult<void>> {
    const response = await this.fetch('/v1/identity/group-alias', {
      method: 'POST',
      body: {
        name: groupAliasName,
        mount_accessor: mountAccessor,
        canonical_id: canonicalId,
      },
    })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }
}
