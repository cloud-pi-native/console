import { Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import z from 'zod'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'

export interface VaultFetchOptions {
  method?: string
  body?: unknown
}

export type VaultErrorKind
  = | 'NotConfigured'
    | 'NotFound'
    | 'HttpError'
    | 'InvalidResponse'
    | 'ParseError'
    | 'Unexpected'

export class VaultError extends Error {
  readonly kind: VaultErrorKind
  readonly status?: number
  readonly method?: string
  readonly path?: string
  readonly statusText?: string
  readonly reasons?: string[]

  constructor(
    kind: VaultErrorKind,
    message: string,
    details: { status?: number, method?: string, path?: string, statusText?: string, reasons?: string[] } = {},
  ) {
    super(message)
    this.name = 'VaultError'
    this.kind = kind
    this.status = details.status
    this.method = details.method
    this.path = details.path
    this.statusText = details.statusText
    this.reasons = details.reasons
  }
}

@Injectable()
export class VaultHttpClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  @StartActiveSpan()
  async fetch<T = any>(
    path: string,
    options: VaultFetchOptions = {},
  ): Promise<T | null> {
    const span = trace.getActiveSpan()
    const method = options.method ?? 'GET'
    span?.setAttribute('vault.method', method)
    span?.setAttribute('vault.path', path)

    const request = this.createRequest(path, method, options.body)
    const response = await fetch(request).catch((error) => {
      throw new VaultError(
        'Unexpected',
        error instanceof Error ? error.message : String(error),
        { method, path },
      )
    })
    span?.setAttribute('vault.http.status', response.status)

    return await this.handleResponse<T>(response, method, path)
  }

  private get baseUrl() {
    const baseUrl = this.config.getInternalOrPublicVaultUrl()
    if (!baseUrl) {
      throw new VaultError('NotConfigured', 'VAULT_INTERNAL_URL or VAULT_URL is required')
    }
    return baseUrl
  }

  private get token() {
    if (!this.config.vaultToken) {
      throw new VaultError('NotConfigured', 'VAULT_TOKEN is required')
    }
    return this.config.vaultToken
  }

  private createRequest(path: string, method: string, body?: unknown): Request {
    const url = new URL(path, this.baseUrl).toString()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Vault-Token': this.token,
    }

    return new Request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  private async handleResponse<T>(response: Response, method: string, path: string): Promise<T | null> {
    if (response.status === 204) return null

    if (!response.ok) {
      await this.throwForStatus(response, method, path)
    }

    return await response.json()
  }

  private async throwForStatus(response: Response, method: string, path: string): Promise<never> {
    const responseBody = await response.json()
    const vaultErrorBody = z.object({ errors: z.array(z.string()) }).safeParse(responseBody)
    const reasons = vaultErrorBody.success ? vaultErrorBody.data.errors : undefined

    if (response.status === 404) {
      throw new VaultError('NotFound', 'Not Found', {
        status: 404,
        method,
        path,
        statusText: response.statusText,
        reasons,
      })
    }

    throw new VaultError('HttpError', 'Request failed', {
      status: response.status,
      method,
      path,
      statusText: response.statusText,
      reasons,
    })
  }
}
