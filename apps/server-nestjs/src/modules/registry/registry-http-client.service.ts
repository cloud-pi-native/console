import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { harborConfigFactory } from '../../config/harbor.config'
import { encodeBasicAuth } from './registry.utils'

export type RegistryQuery = Record<string, string | number>

export interface RegistryFetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  query?: RegistryQuery
}

export interface RegistryResponse<T = unknown> {
  status: HttpStatus
  data: T | null
}

export type RegistryErrorKind
  = | 'NotConfigured'
    | 'Unexpected'

export class RegistryError extends Error {
  readonly kind: RegistryErrorKind
  readonly status?: HttpStatus
  readonly method?: string
  readonly path?: string
  readonly statusText?: string

  constructor(
    kind: RegistryErrorKind,
    message: string,
    details: { status?: HttpStatus, method?: string, path?: string, statusText?: string } = {},
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
    @Inject(harborConfigFactory.KEY) private readonly harborConfig: ConfigType<typeof harborConfigFactory>,
  ) {}

  private get apiBaseUrl() {
    return new URL('api/v2.0/', this.harborConfig.internalUrl ?? this.harborConfig.url).toString()
  }

  private get defaultHeaders() {
    return { Accept: 'application/json', Authorization: `Basic ${encodeBasicAuth(this.harborConfig.admin, this.harborConfig.adminPassword)}` }
  }

  async fetch<T = unknown>(
    path: string,
    options: RegistryFetchOptions = {},
  ): Promise<RegistryResponse<T>> {
    const span = trace.getActiveSpan()
    const method = options.method ?? 'GET'
    span?.setAttribute('registry.method', method)
    span?.setAttribute('registry.path', path)

    const request = this.createRequest(path, method, options)
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

  private createRequest(path: string, method: string, options: RegistryFetchOptions): Request {
    const url = new URL(path, this.apiBaseUrl)
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.set(key, String(value))
      }
    }
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers,
    }
    let requestBody: string | undefined
    if (options.body !== undefined) {
      requestBody = JSON.stringify(options.body)
      headers['Content-Type'] = 'application/json'
    }
    return new Request(url, { method, headers, body: requestBody })
  }
}

async function handleResponse<T>(response: Response): Promise<RegistryResponse<T>> {
  if (response.status === HttpStatus.NO_CONTENT) return { status: response.status, data: null }
  const contentType = response.headers.get('content-type') ?? ''
  const parsed = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  return { status: response.status, data: parsed as T }
}
