import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { nexusConfigFactory } from '../../config/nexus.config'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'

export interface NexusFetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export interface NexusResponse<T = unknown> {
  status: HttpStatus
  data: T | null
}

export type NexusErrorKind
  = | 'NotConfigured'
    | 'HttpError'
    | 'Unexpected'

export class NexusError extends Error {
  readonly kind: NexusErrorKind
  readonly status?: HttpStatus
  readonly method?: string
  readonly path?: string
  readonly statusText?: string

  constructor(
    kind: NexusErrorKind,
    message: string,
    details: { status?: HttpStatus, method?: string, path?: string, statusText?: string } = {},
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
    @Inject(nexusConfigFactory.KEY) private readonly nexusConfig: ConfigType<typeof nexusConfigFactory>,
  ) {}

  @StartActiveSpan()
  async fetch<T = unknown>(path: string, options: NexusFetchOptions = {}): Promise<NexusResponse<T>> {
    const span = trace.getActiveSpan()
    const method = options.method ?? 'GET'
    span?.setAttribute('nexus.method', method)
    span?.setAttribute('nexus.path', path)

    const request = this.createRequest(path, method, options)
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
      throw new NexusError('HttpError', `Request failed: ${method} ${path} responded ${result.status} ${response.statusText}`, {
        status: result.status,
        method,
        path,
        statusText: response.statusText,
      })
    }
    return result
  }

  private get apiBaseUrl() {
    return new URL('service/rest/v1/', this.nexusConfig.internalUrl ?? this.nexusConfig.url).toString()
  }

  private get basicAuth() {
    const raw = `${this.nexusConfig.admin}:${this.nexusConfig.adminPassword}`
    return Buffer.from(raw, 'utf8').toString('base64')
  }

  private createRequest(path: string, method: string, options?: NexusFetchOptions): Request {
    const url = new URL(path, this.apiBaseUrl).toString()
    const headers: Record<string, string> = {
      Authorization: `Basic ${this.basicAuth}`,
      ...options?.headers,
    }
    let requestBody: string | undefined
    if (options?.body !== undefined) {
      if (typeof options.body === 'string') {
        requestBody = options.body
        headers['Content-Type'] = 'text/plain'
      } else {
        requestBody = JSON.stringify(options.body)
        headers['Content-Type'] = 'application/json'
      }
    }
    return new Request(url, { method, headers, body: requestBody })
  }
}

async function handleResponse<T>(response: Response): Promise<NexusResponse<T>> {
  if (response.status === HttpStatus.NO_CONTENT) return { status: response.status, data: null }
  const contentType = response.headers.get('content-type') ?? ''
  const parsed = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  return { status: response.status, data: parsed as T }
}
