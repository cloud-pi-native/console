import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { generateKVConfigUpdate } from './vault.utils'
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

@Injectable()
export class VaultClientService {
  private readonly logger = new Logger(VaultClientService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  private async request<T = any>(method: string, path: string, options: { body?: any } = {}): Promise<T | null> {

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  }

  async read<T = any>(path: string): Promise<VaultResult<VaultSecret<T>>> {
    if (path.startsWith('/')) path = path.slice(1)
      const data = await this.request<VaultResponse<T>>('GET', `/v1/${this.config.vaultKvName}/data/${path}`)
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
      await this.request('POST', `/v1/${this.config.vaultKvName}/data/${path}`, {
    }
    return { data: undefined, error: null }
  }

  async destroy(path: string): Promise<VaultResult<void>> {
    if (path.startsWith('/')) path = path.slice(1)
      await this.request('DELETE', `/v1/${this.config.vaultKvName}/metadata/${path}`)
    }
    return { data: undefined, error: null }
  }
}
