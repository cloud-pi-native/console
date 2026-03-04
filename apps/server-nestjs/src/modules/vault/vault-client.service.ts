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

  private async request<T = any>(method: string, path: string, options: { body?: any, token?: string, allow404?: boolean } = {}): Promise<T | undefined> {
    const url = `${this.config.vaultInternalUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (options.token) {
      headers['X-Vault-Token'] = options.token
    } else if (this.config.vaultToken) {
      headers['X-Vault-Token'] = this.config.vaultToken
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (options.allow404 && response.status === 404) {
      return undefined
    }

    if (!response.ok) {
      throw new Error(`Vault request failed: ${response.status} ${response.statusText}`)
    }

    if (response.status === 204) return undefined

    return response.json()
  }

  private async getToken() {
    if (this.config.vaultToken) {
      try {
        const data = await this.request<{ auth: { client_token: string } }>('POST', '/v1/auth/token/create', { token: this.config.vaultToken })
        return data?.auth.client_token
      } catch (error) {
        this.logger.error('Failed to create vault token, falling back to env token', error)
        return this.config.vaultToken
      }
    }
  }

  async read<T = any>(path: string): Promise<VaultSecret<T> | undefined> {
    if (path.startsWith('/')) path = path.slice(1)
    try {
      const token = await this.getToken()
      const data = await this.request<VaultResponse<T>>('GET', `/v1/${this.config.vaultKvName}/data/${path}`, {
        token,
        allow404: true,
      })
      if (!data) return undefined
      return data.data
    } catch (error) {
      this.logger.error(`Failed to read vault path ${path}: ${error}`)
      throw error
    }
  }

  async write<T = any>(data: T, path: string): Promise<void> {
    if (path.startsWith('/')) path = path.slice(1)
    try {
      const token = await this.getToken()
      await this.request('POST', `/v1/${this.config.vaultKvName}/data/${path}`, {
        token,
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
      const token = await this.getToken()
      await this.request('DELETE', `/v1/${this.config.vaultKvName}/metadata/${path}`, {
        token,
      })
    } catch (error) {
      this.logger.error(`Failed to destroy vault path ${path}: ${error}`)
      throw error
    }
  }
}
