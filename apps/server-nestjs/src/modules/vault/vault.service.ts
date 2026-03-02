import { Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name)
  private token: string | undefined

  constructor(private readonly config: ConfigurationService) {
    this.logger.log('VaultService initialized with config:', config)
  }

  async getProjectValues(projectId: string): Promise<Record<string, any>> {
    const path = this.config.projectRootDir
      ? `${this.config.projectRootDir}/${projectId}`
      : projectId
    const values = await this.read(path)
    return values || {}
  }

  private async request(method: string, path: string, options: { body?: any, token?: string, allow404?: boolean } = {}) {
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
    if (!this.token) {
      if (this.config.vaultToken) {
        try {
          const data = await this.request('POST', '/v1/auth/token/create', { token: this.config.vaultToken })
          this.token = data.auth.client_token
        } catch (error) {
          this.logger.error('Failed to create vault token, falling back to env token', error)
          this.token = this.config.vaultToken
        }
      }
    }
    return this.token
  }

  async read(path: string): Promise<any> {
    if (path.startsWith('/')) path = path.slice(1)
    try {
      const token = await this.getToken()
      const data = await this.request('GET', `/v1/${this.config.vaultKvName}/data/${path}`, {
        token,
        allow404: true,
      })
      if (!data) return undefined
      return data.data.data
    } catch (error) {
      this.logger.error(`Failed to read vault path ${path}: ${error}`)
      throw error
    }
  }

  async write(data: any, path: string): Promise<void> {
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
