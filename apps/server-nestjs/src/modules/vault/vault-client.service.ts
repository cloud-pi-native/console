import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

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

@Injectable()
export class VaultClientService {
  private readonly logger = new Logger(VaultClientService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  private async fetch<T = any>(path: string, options: { method?: string, body?: any } = {}): Promise<T | null> {
    const url = `${this.config.vaultInternalUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Vault-Token': this.config.vaultToken,
    }

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Vault request failed: ${response.status} ${response.statusText}`)
    }
    if (response.status === 204) return null

    return response.json()
  }

  async read<T = any>(path: string): Promise<VaultSecret<T> | null> {
    if (path.startsWith('/')) path = path.slice(1)
    try {
      const data = await this.fetch<VaultResponse<T>>(`/v1/${this.config.vaultKvName}/data/${path}`, {
        method: 'GET',
      })
      if (!data) return null
      return data.data
    } catch (error) {
      this.logger.error(`Failed to read vault path ${path}: ${error}`)
      throw error
    }
  }

  async write<T = any>(data: T, path: string): Promise<void> {
    if (path.startsWith('/')) path = path.slice(1)
    try {
      await this.fetch(`/v1/${this.config.vaultKvName}/data/${path}`, {
        method: 'POST',
        body: { data },
      })
    } catch (error) {
      this.logger.error(`Failed to write vault path ${path}: ${error}`)
      throw error
    }
  }

  async destroy(path: string): Promise<void> {
    if (path.startsWith('/')) path = path.slice(1)
    try {
      await this.fetch(`/v1/${this.config.vaultKvName}/metadata/${path}`, {
        method: 'DELETE',
      })
    } catch (error) {
      this.logger.error(`Failed to destroy vault path ${path}: ${error}`)
      throw error
    }
  }

  async upsertPolicyAcl(policyName: string, data: any) {
    await this.fetch(`/v1/sys/policies/acl/${policyName}`, {
      method: 'POST',
      body: data,
    })
  }

  async createMount(name: string, data: any) {
    this.fetch(`/v1/sys/mounts/${name}/tune`, {
      method: 'POST',
      body: data,
    })
  }

  async updateMount(name: string, data: any) {
    this.fetch(`/v1/sys/mounts/${name}/tune`, {
      method: 'PUT',
      body: data,
    })
  }

  async upsertRole(roleName: string, policies: string[]) {
    await this.fetch(`/v1/auth/approle/role/${roleName}`, {
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
  }
}
