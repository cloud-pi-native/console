import { Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'

export interface NexusFetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export interface NexusResponse<T = unknown> {
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
export class NexusHttpClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  @StartActiveSpan()
  async fetch<T = unknown>(path: string, options: NexusFetchOptions = {}): Promise<NexusResponse<T>> {
    const span = trace.getActiveSpan()
    const method = options.method ?? 'GET'
    span?.setAttribute('nexus.method', method)
    span?.setAttribute('nexus.path', path)

    const request = this.createRequest(path, method, options.body, options.headers)
    const response = await fetch(request).catch((error) => {
      throw new NexusError(
        'Unexpected',
        error instanceof Error ? error.message : String(error),
        { method, path },
      )
    })
    span?.setAttribute('nexus.http.status', response.status)
    const result = await handleResponse<T>(response)
    if (!response.ok) {
      throw new NexusError('HttpError', 'Request failed', {
        status: result.status,
        method,
        path,
        statusText: response.statusText,
      })
    }
    return result
  }

  private get baseUrl() {
    if (!this.config.nexusInternalUrl) {
      throw new NexusError('NotConfigured', 'NEXUS_INTERNAL_URL is required')
    }
    return this.config.nexusInternalUrl
  }

  private get apiBaseUrl() {
    return new URL('service/rest/v1/', this.baseUrl).toString()
  }

  private get basicAuth() {
    if (!this.config.nexusAdmin) {
      throw new NexusError('NotConfigured', 'NEXUS_ADMIN is required')
    }
    if (!this.config.nexusAdminPassword) {
      throw new NexusError('NotConfigured', 'NEXUS_ADMIN_PASSWORD is required')
    }
    const raw = `${this.config.nexusAdmin}:${this.config.nexusAdminPassword}`
    return Buffer.from(raw, 'utf8').toString('base64')
  }

  private createRequest(path: string, method: string, body?: unknown, extraHeaders?: Record<string, string>): Request {
    const url = new URL(path, this.apiBaseUrl).toString()
    const headers: Record<string, string> = {
      Authorization: `Basic ${this.basicAuth}`,
      ...extraHeaders,
    }
    let requestBody: string | undefined
    if (body !== undefined) {
      if (typeof body === 'string') {
        requestBody = body
        headers['Content-Type'] = 'text/plain'
      } else {
        requestBody = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
      }
    }
    return new Request(url, { method, headers, body: requestBody })
  }
}

async function handleResponse<T>(response: Response): Promise<NexusResponse<T>> {
  if (response.status === 204) return { status: response.status, data: null }
  const contentType = response.headers.get('content-type') ?? ''
  const parsed = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  return { status: response.status, data: parsed as T }
}
