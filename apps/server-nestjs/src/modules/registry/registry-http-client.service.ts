import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { encodeBasicAuth, removeTrailingSlash } from './registry.utils'

export interface RegistryHttpRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
}

@Injectable()
export class RegistryHttpClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  private get baseUrl() {
    return `${removeTrailingSlash(this.config.harborInternalUrl!)}/api/v2.0`
  }

  private get defaultHeaders() {
    return {
      Accept: 'application/json',
      Authorization: `Basic ${encodeBasicAuth(this.config.harborAdmin!, this.config.harborAdminPassword!)}`,
    } as const
  }

  async fetch<T = any>(
    path: string,
    options: RegistryHttpRequestOptions = {},
  ): Promise<{ status: number, data: T | null }> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers,
    }
    if (options.body) headers['Content-Type'] = 'application/json'
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (response.status === 204) return { status: response.status, data: null }

    const contentType = response.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    return { status: response.status, data: body as T }
  }
}
