import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { trace } from '@opentelemetry/api'

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
    if (path.startsWith('/')) path = path.slice(1)
      const data = await this.fetch<VaultResponse<T>>(`/v1/${this.config.vaultKvName}/data/${path}`, {
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
    if (path.startsWith('/')) path = path.slice(1)
      await this.fetch(`/v1/${this.config.vaultKvName}/data/${path}`, {
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
    if (path.startsWith('/')) path = path.slice(1)
      await this.fetch(`/v1/${this.config.vaultKvName}/metadata/${path}`, {
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

  async upsertPolicyAcl(policyName: string, data: any): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/sys/policies/acl/${policyName}`, { method: 'POST', body: data })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

    this.fetch(`/v1/sys/mounts/${name}/tune`, {
  async createMount(name: string, data: any): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/sys/mounts/${name}`, { method: 'POST', body: data })
    if (response.error) return { data: null, error: response.error }
    return { data: undefined, error: null }
  }

    this.fetch(`/v1/sys/mounts/${name}/tune`, {
      method: 'PUT',
  async updateMount(name: string, data: any): Promise<VaultResult<void>> {
    const response = await this.fetch(`/v1/sys/mounts/${name}/tune`, { method: 'POST', body: data })
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
}
