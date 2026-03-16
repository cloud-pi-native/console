import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { removeTrailingSlash } from './nexus.utils'

interface NexusRequestOptions {
  method?: string
  url: string
  data?: unknown
  headers?: Record<string, string>
  validateStatus?: (code: number) => boolean
}

interface NexusResponse<T = unknown> {
  status: number
  data: T | null
}

@Injectable()
export class NexusClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  private get baseUrl() {
    return `${removeTrailingSlash(this.config.nexusInternalUrl!)}/service/rest/v1`
  }

  private get defaultHeaders() {
    const raw = `${this.config.nexusAdmin!}:${this.config.nexusAdminPassword!}`
    const encoded = Buffer.from(raw, 'utf8').toString('base64')
    return {
      Accept: 'application/json',
      Authorization: `Basic ${encoded}`,
    } as const
  }

  async axios<T = unknown>(options: NexusRequestOptions): Promise<NexusResponse<T>> {
    const url = `${this.baseUrl}${options.url.startsWith('/') ? '' : '/'}${options.url}`
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers,
    }

    const method = (options.method ?? 'GET').toUpperCase()
    let body: string | undefined
    if (options.data !== undefined) {
      if (typeof options.data === 'string') {
        body = options.data
      } else {
        body = JSON.stringify(options.data)
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    })

    if (response.status === 204) {
      const result: NexusResponse<T> = { status: response.status, data: null }
      if (options.validateStatus && !options.validateStatus(response.status)) {
        const error = new Error(`Nexus request failed (${response.status})`)
        ;(error as any).response = result
        throw error
      }
      return result
    }

    const contentType = response.headers.get('content-type') ?? ''
    const parsed = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    const result: NexusResponse<T> = { status: response.status, data: parsed as T }
    if (options.validateStatus && !options.validateStatus(response.status)) {
      const error = new Error(`Nexus request failed (${response.status})`)
      ;(error as any).response = result
      throw error
    }
    return result
  }

  async deleteIfExists(path: string) {
    return this.axios({
      method: 'delete',
      url: path,
      validateStatus: code => code === 404 || code < 300,
    })
  }
}
