import type { ConfigType } from '@nestjs/config'
import type { HeadersInit, RequestInit } from 'undici'
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common'
import { Agent, fetch, Headers, Request } from 'undici'
import { baseConfigFactory } from '../../config/base.config'
import { serviceChainConfigFactory } from '../../config/service-chain.config'
import { OpenCdsClientError, throwIfNotOk } from './service-chain.utils'

export interface OpenCdsRequestOptions {
  headers?: HeadersInit
  signal?: AbortSignal
  query?: Record<string, string | number | boolean>
}

@Injectable()
export class OpenCdsClientService {
  constructor(
    @Inject(serviceChainConfigFactory.KEY) private readonly opencdsConfig: ConfigType<typeof serviceChainConfigFactory>,
    @Inject(baseConfigFactory.KEY) private readonly baseConfig: ConfigType<typeof baseConfigFactory>,
  ) {}

  private readonly logger = new Logger(OpenCdsClientService.name)

  async get<T>(path: string, options?: OpenCdsRequestOptions): Promise<T> {
    const request = this.createRequest('GET', path, undefined, options)
    this.logger.debug(`Retrieving data from URL: ${request.url}`)

    const response = await fetch(request).catch((error) => {
      throw new OpenCdsClientError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : String(error),
      )
    })

    await throwIfNotOk(response)
    return (await response.json()) as T
  }

  async post<TBody = void>(
    path: string,
    body?: TBody,
    options?: OpenCdsRequestOptions,
  ): Promise<void> {
    const requestBody = JSON.stringify(body)
    const request = this.createRequest('POST', path, requestBody, options)

    const response = await fetch(request).catch((error) => {
      throw new OpenCdsClientError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : String(error),
      )
    })

    await throwIfNotOk(response)
  }

  private createRequest(
    method: string,
    path: string,
    body?: string,
    options?: OpenCdsRequestOptions,
  ): Request {
    const url = new URL(path.replace(/^\/+/, ''), `${this.opencdsConfig.url}/`)

    for (const [key, value] of Object.entries(options?.query ?? {})) {
      url.searchParams.append(key, String(value))
    }

    const headers = new Headers(options?.headers)
    headers.set('X-API-Key', this.opencdsConfig.apiToken)
    if (body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    const init: RequestInit = {
      method,
      headers,
      body,
      signal: options?.signal,
    }

    if (!this.opencdsConfig.apiTlsRejectUnauthorized) {
      init.dispatcher = new Agent({ connect: { rejectUnauthorized: false } })
    }

    return new Request(url, init)
  }
}
