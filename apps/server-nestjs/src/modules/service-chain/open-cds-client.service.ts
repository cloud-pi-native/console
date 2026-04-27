import type { Dispatcher, HeadersInit, Response } from 'undici'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { Agent, fetch, Headers, ProxyAgent } from 'undici'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'

const openCdsDisabledMessage
  = 'OpenCDS is disabled, please set OPENCDS_URL in your relevant .env file. See .env-example'

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
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: string,
  ) {
    super(`OpenCDS request failed with ${status} ${statusText}`)
    this.name = 'OpenCdsClientError'
  }
}

@Injectable()
export class OpenCdsClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
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

    await this.throwIfNotOk(response)

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

    await this.throwIfNotOk(response)
  }

  private buildUrl(
    path: string,
    query?: OpenCdsRequestOptions['query'],
  ): string {
    if (!this.config.openCdsUrl) {
      throw new Error(openCdsDisabledMessage)
    }

    const resolvedPath = URL_REGEX.test(path)
      ? path
      : `${this.config.openCdsUrl.replace(END_SLASHES_REGEX, '')}/${path.replace(START_SLASHES_REGEX, '')}`

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
    mergedHeaders.set('X-API-Key', this.config.openCdsApiToken ?? '')

    if (hasJsonBody) {
      mergedHeaders.set('Content-Type', 'application/json')
    }

    return mergedHeaders
  }

  private buildDispatcher(): Dispatcher {
    if (process.env.HTTP_PROXY) {
      return new ProxyAgent({
        requestTls: {
          rejectUnauthorized: this.config.openCdsApiTlsRejectUnauthorized,
        },
        uri: process.env.HTTP_PROXY,
      })
    }

    return new Agent({
      connect: {
        rejectUnauthorized: this.config.openCdsApiTlsRejectUnauthorized,
      },
    })
  }

  private async throwIfNotOk(response: Response): Promise<void> {
    if (response.ok) {
      return
    }

    const body = await response.text()

    throw new OpenCdsClientError(
      response.status,
      response.statusText,
      body || undefined,
    )
  }
}
