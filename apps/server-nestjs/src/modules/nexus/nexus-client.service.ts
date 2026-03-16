import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { removeTrailingSlash } from './nexus.utils'

interface NexusRequestOptions {
  method?: string
  path: string
  body?: unknown
  headers?: Record<string, string>
  validateStatus?: (code: number) => boolean
}

interface NexusResponse<T = unknown> {
  status: number
  data: T | null
}

export type NexusErrorKind
  = | 'NotConfigured'
    | 'HttpError'
    | 'Unexpected'

export class NexusError extends Error {
  readonly kind: NexusErrorKind
  readonly status?: number
  readonly method?: string
  readonly path?: string
  readonly statusText?: string

  constructor(
    kind: NexusErrorKind,
    message: string,
    details: { status?: number, method?: string, path?: string, statusText?: string } = {},
  ) {
    super(message)
    this.name = 'NexusError'
    this.kind = kind
    this.status = details.status
    this.method = details.method
    this.path = details.path
    this.statusText = details.statusText
  }
}

@Injectable()
export class NexusClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  private get baseUrl() {
    if (!this.config.nexusInternalUrl) {
      throw new NexusError('NotConfigured', 'NEXUS_INTERNAL_URL is required')
    }
    return `${removeTrailingSlash(this.config.nexusInternalUrl)}/service/rest/v1`
  }

  private get defaultHeaders() {
    if (!this.config.nexusAdmin) {
      throw new NexusError('NotConfigured', 'NEXUS_ADMIN is required')
    }
    if (!this.config.nexusAdminPassword) {
      throw new NexusError('NotConfigured', 'NEXUS_ADMIN_PASSWORD is required')
    }
    const raw = `${this.config.nexusAdmin}:${this.config.nexusAdminPassword}`
    const encoded = Buffer.from(raw, 'utf8').toString('base64')
    return {
      Accept: 'application/json',
      Authorization: `Basic ${encoded}`,
    } as const
  }

  async request<T = unknown>(path: string, options: Omit<NexusRequestOptions, 'path'> = {}): Promise<NexusResponse<T>> {
    const method = options.method ?? 'GET'
    const request = this.createRequest(path, method, options.body, options.headers)

    const response = await fetch(request).catch((error) => {
      throw new NexusError(
        'Unexpected',
        error instanceof Error ? error.message : String(error),
        { method, path },
      )
    })

    const result = await this.handleResponse<T>(response)

    if (options.validateStatus && !options.validateStatus(result.status)) {
      throw new NexusError('HttpError', 'Request failed', {
        status: result.status,
        method,
        path,
        statusText: response.statusText,
      })
    }

    if (!options.validateStatus && !response.ok) {
      throw new NexusError('HttpError', 'Request failed', {
        status: result.status,
        method,
        path,
        statusText: response.statusText,
      })
    }
    return result
  }

  private createRequest(path: string, method: string, body?: unknown, extraHeaders?: Record<string, string>): Request {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...extraHeaders,
    }

    let requestBody: string | undefined
    if (body !== undefined) {
      if (typeof body === 'string') {
        requestBody = body
      } else {
        requestBody = JSON.stringify(body)
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
      }
    }

    return new Request(url, { method, headers, body: requestBody })
  }

  private async handleResponse<T>(response: Response): Promise<NexusResponse<T>> {
    if (response.status === 204) return { status: response.status, data: null }

    const contentType = response.headers.get('content-type') ?? ''
    const parsed = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    return { status: response.status, data: parsed as T }
  }

  async deleteIfExists(path: string) {
    return this.request(path, {
      method: 'DELETE',
      validateStatus: code => code === 404 || code < 300,
    })
  }
}
