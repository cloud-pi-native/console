import type { HttpStatus } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import type { Dispatcher, HeadersInit } from 'undici'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { Agent, fetch, Headers } from 'undici'
import { baseConfigFactory } from '../../config/base.config'
import { serviceChainConfigFactory } from '../../config/service-chain.config'
import { throwIfNotOk } from './service-chain.utils'

const URL_REGEX = /^https?:\/\//
const START_SLASHES_REGEX = /^\/+/
const END_SLASHES_REGEX = /\/+$/

export interface OpenCdsRequestOptions {
  headers?: HeadersInit
  signal?: AbortSignal
  query?: Record<string, string | number | boolean | undefined>
}

export class OpenCdsClientError extends Error {
  constructor(
    public readonly status: HttpStatus,
    public readonly statusText: string,
    public readonly body?: string,
  ) {
    super(`OpenCDS request failed with ${status} ${statusText}`)
  }
}

@Injectable()
export class OpenCdsClientService {
  constructor(
    @Inject(serviceChainConfigFactory.KEY) private readonly opencdsConfig: ConfigType<typeof serviceChainConfigFactory>,
    @Inject(baseConfigFactory.KEY) private readonly baseConfig: ConfigType<typeof baseConfigFactory>,
  ) {}

  private readonly logger = new Logger(OpenCdsClientService.name)

  async get<T>(path: string, options?: OpenCdsRequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.query)
    this.logger.debug(`Retrieving data from URL: ${url}`)

    const headers = this.buildHeaders(options?.headers)

    const response = await fetch(url, {
      dispatcher: this.buildDispatcher(),
      headers,
      method: 'GET',
      signal: options?.signal,
    })

    await throwIfNotOk(response)

    return (await response.json()) as T
  }

  async post<TBody = void>(
    path: string,
    body?: TBody,
    options?: OpenCdsRequestOptions,
  ): Promise<void> {
    const hasBody = body !== undefined

    const response = await fetch(this.buildUrl(path, options?.query), {
      body: hasBody ? JSON.stringify(body) : undefined,
      dispatcher: this.buildDispatcher(),
      headers: this.buildHeaders(options?.headers, hasBody),
      method: 'POST',
      signal: options?.signal,
    })

    await throwIfNotOk(response)
  }

  private buildUrl(
    path: string,
    query?: OpenCdsRequestOptions['query'],
  ): string {
    if (!this.opencdsConfig.url) throw new Error('OpenCDS is disabled')

    const resolvedPath = URL_REGEX.test(path)
      ? path
      : `${this.opencdsConfig.url.replace(END_SLASHES_REGEX, '')}/${path.replace(START_SLASHES_REGEX, '')}`

    const url = new URL(resolvedPath)

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    }

    return url.toString()
  }

  private buildHeaders(
    headers?: OpenCdsRequestOptions['headers'],
    hasJsonBody = false,
  ): Headers {
    const mergedHeaders = new Headers(headers)
    mergedHeaders.set('X-API-Key', this.opencdsConfig.apiToken ?? '')

    if (hasJsonBody) {
      mergedHeaders.set('Content-Type', 'application/json')
    }

    return mergedHeaders
  }

  private buildDispatcher(): Dispatcher | undefined {
    // Only the TLS-verify-disabled case needs a local dispatcher; proxy bypass on
    // that rare path is accepted. Security default (apiTlsRejectUnauthorized=true) keeps cert verification ON.
    if (!this.opencdsConfig.apiTlsRejectUnauthorized) {
      return new Agent({ connect: { rejectUnauthorized: false } })
    }

    return undefined
  }
}
