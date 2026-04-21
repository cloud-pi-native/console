import { Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { encodeBasicAuth } from './registry.utils'

export interface RegistryFetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
}

export interface RegistryResponse<T = unknown> {
  status: number
  data: T | null
}

export type RegistryErrorKind
  = | 'NotConfigured'
    | 'Unexpected'

export class RegistryError extends Error {
  readonly kind: RegistryErrorKind
  readonly status?: number
  readonly method?: string
  readonly path?: string
  readonly statusText?: string

  constructor(
    kind: RegistryErrorKind,
    message: string,
    details: { status?: number, method?: string, path?: string, statusText?: string } = {},
  ) {
    super(message)
    this.name = 'RegistryError'
    this.kind = kind
    this.status = details.status
    this.method = details.method
    this.path = details.path
    this.statusText = details.statusText
  }
}

@Injectable()
export class RegistryHttpClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  private get baseUrl() {
    if (!this.config.harborInternalUrl) {
      throw new RegistryError('NotConfigured', 'HARBOR_INTERNAL_URL is required')
    }
    return this.config.harborInternalUrl
  }

  private get apiBaseUrl() {
    return new URL('/api/v2.0', this.baseUrl).toString()
  }

  private get defaultHeaders() {
    if (!this.config.harborAdmin) {
      throw new RegistryError('NotConfigured', 'HARBOR_ADMIN is required')
    }
    if (!this.config.harborAdminPassword) {
      throw new RegistryError('NotConfigured', 'HARBOR_ADMIN_PASSWORD is required')
    }
    return { Accept: 'application/json', Authorization: `Basic ${encodeBasicAuth(this.config.harborAdmin, this.config.harborAdminPassword)}` }
  }

  async fetch<T = unknown>(
    path: string,
    options: RegistryFetchOptions = {},
  ): Promise<RegistryResponse<T>> {
    const span = trace.getActiveSpan()
    const method = options.method ?? 'GET'
    span?.setAttribute('registry.method', method)
    span?.setAttribute('registry.path', path)

    const request = this.createRequest(path, method, options.body, options.headers)
    const response = await fetch(request).catch((error) => {
      throw new RegistryError(
        'Unexpected',
        error instanceof Error ? error.message : String(error),
        { method, path },
      )
    })
    span?.setAttribute('registry.http.status', response.status)
    return await handleResponse<T>(response)
  }

  private createRequest(path: string, method: string, body?: unknown, extraHeaders?: Record<string, string>): Request {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path
    const url = new URL(normalizedPath, this.apiBaseUrl).toString()
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...extraHeaders,
    }
    let requestBody: string | undefined
    if (body !== undefined) {
      requestBody = JSON.stringify(body)
      headers['Content-Type'] = 'application/json'
    }
    return new Request(url, { method, headers, body: requestBody })
  }
}

async function handleResponse<T>(response: Response): Promise<RegistryResponse<T>> {
  if (response.status === 204) return { status: response.status, data: null }
  const contentType = response.headers.get('content-type') ?? ''
  const parsed = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  return { status: response.status, data: parsed as T }
}
