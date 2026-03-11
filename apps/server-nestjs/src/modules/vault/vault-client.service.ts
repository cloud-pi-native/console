import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

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
  ) {
  }

  private async fetch<T = any>(path: string, options: { method?: string, body?: any } = {}): Promise<T | null> {
    if (!this.config.vaultInternalUrl) {
      throw new Error('VAULT_INTERNAL_URL is required')
    }
    if (!this.config.vaultToken) {
      throw new Error('VAULT_TOKEN is required')
    }

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
    return this.readFromKv(this.config.vaultKvName, path)
  }

  async readFromKv<T = any>(kvName: string, path: string): Promise<VaultSecret<T> | null> {
    if (path.startsWith('/')) path = path.slice(1)
    try {
      const data = await this.fetch<VaultResponse<T>>(`/v1/${kvName}/data/${path}`, {
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
    return this.writeToKv(this.config.vaultKvName, data, path)
  }

  async writeToKv<T = any>(kvName: string, data: T, path: string): Promise<void> {
    if (path.startsWith('/')) path = path.slice(1)
    try {
      await this.fetch(`/v1/${kvName}/data/${path}`, {
        method: 'POST',
        body: { data },
      })
    } catch (error) {
      this.logger.error(`Failed to write vault path ${path}: ${error}`)
      throw error
    }
  }

  async destroy(path: string): Promise<void> {
    return this.destroyInKv(this.config.vaultKvName, path)
  }

  async destroyInKv(kvName: string, path: string): Promise<void> {
    if (path.startsWith('/')) path = path.slice(1)
    try {
      await this.fetch(`/v1/${kvName}/metadata/${path}`, {
        method: 'DELETE',
      })
    } catch (error) {
      this.logger.error(`Failed to destroy vault path ${path}: ${error}`)
      throw error
    }
  }

  async listInKv(kvName: string, path: string): Promise<string[] | null> {
    if (path.startsWith('/')) path = path.slice(1)
    const normalized = path.length === 0 ? '' : path.endsWith('/') ? path : `${path}/`
    const response = await this.fetch<VaultListResponse>(`/v1/${kvName}/metadata/${normalized}`, {
      method: 'LIST',
    })
    if (!response) return null
    return response.data.keys
  }

  async upsertPolicyAcl(policyName: string, data: any) {
    await this.fetch(`/v1/sys/policies/acl/${policyName}`, {
      method: 'POST',
      body: data,
    })
  }

  async deletePolicyAcl(policyName: string) {
    await this.fetch(`/v1/sys/policies/acl/${policyName}`, {
      method: 'DELETE',
    })
  }

  async createMount(name: string, data: any) {
    await this.fetch(`/v1/sys/mounts/${name}`, {
      method: 'POST',
      body: data,
    })
  }

  async updateMount(name: string, data: any) {
    await this.fetch(`/v1/sys/mounts/${name}/tune`, {
      method: 'POST',
      body: data,
    })
  }

  async deleteMount(name: string) {
    await this.fetch(`/v1/sys/mounts/${name}`, {
      method: 'DELETE',
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

  async deleteRole(roleName: string) {
    await this.fetch(`/v1/auth/approle/role/${roleName}`, {
      method: 'DELETE',
    })
  }

  async getRoleId(roleName: string): Promise<string> {
    const response = await this.fetch<VaultRoleIdResponse>(`/v1/auth/approle/role/${roleName}/role-id`, {
      method: 'GET',
    })
    if (!response?.data?.role_id) {
      throw new Error(`Vault role-id not found for role ${roleName}`)
    }
    return response.data.role_id
  }

  async generateSecretId(roleName: string): Promise<string> {
    const response = await this.fetch<VaultSecretIdResponse>(`/v1/auth/approle/role/${roleName}/secret-id`, {
      method: 'POST',
    })
    if (!response?.data?.secret_id) {
      throw new Error(`Vault secret-id not generated for role ${roleName}`)
    }
    return response.data.secret_id
  }

  async getAuthMethods(): Promise<Record<string, VaultAuthMethod>> {
    const response = await this.fetch<VaultSysAuthResponse>('/v1/sys/auth', { method: 'GET' })
    return response?.data ?? {}
  }

  async upsertIdentityGroup(groupName: string, policies: string[]) {
    await this.fetch(`/v1/identity/group/name/${groupName}`, {
      method: 'POST',
      body: {
        name: groupName,
        type: 'external',
        policies,
      },
    })
  }

  async getIdentityGroup(groupName: string): Promise<VaultIdentityGroupResponse | null> {
    return this.fetch<VaultIdentityGroupResponse>(`/v1/identity/group/name/${groupName}`, { method: 'GET' })
  }

  async deleteIdentityGroup(groupName: string) {
    await this.fetch(`/v1/identity/group/name/${groupName}`, {
      method: 'DELETE',
    })
  }

  async createGroupAlias(groupAliasName: string, mountAccessor: string, canonicalId: string) {
    await this.fetch('/v1/identity/group-alias', {
      method: 'POST',
      body: {
        name: groupAliasName,
        mount_accessor: mountAccessor,
        canonical_id: canonicalId,
      },
    })
  }
}
