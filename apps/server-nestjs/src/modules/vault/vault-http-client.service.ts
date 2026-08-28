import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import z from 'zod'
import { vaultConfigFactory } from '../../config/vault.config'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'

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
  readonly status?: HttpStatus
  readonly method?: string
  readonly path?: string
  readonly statusText?: string
  readonly reasons?: string[]

  constructor(
    kind: VaultErrorKind,
    message: string,
    details: { status?: HttpStatus, method?: string, path?: string, statusText?: string, reasons?: string[] } = {},
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
  private readonly logger = new Logger(VaultHttpClientService.name)

  constructor(
    @Inject(vaultConfigFactory.KEY) private readonly vaultConfig: ConfigType<typeof vaultConfigFactory>,
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

    this.logger.verbose(`Starting Vault request: ${method} ${path}`)
    this.logger.debug(`Vault request: ${method} ${path}`)
    const request = this.createRequest(path, method, options.body)
    const response = await fetch(request).catch((error) => {
      if (error instanceof Error) {
        this.logger.error(`Vault request failed: ${method} ${path}: ${error.message}`, error.stack)
      } else {
        this.logger.error(`Vault request failed: ${method} ${path}: ${String(error)}`)
      }
      throw new VaultError(
        'Unexpected',
        error instanceof Error ? error.message : String(error),
        { method, path },
      )
    })
    span?.setAttribute('vault.http.status', response.status)
    this.logger.debug(`Vault response: ${method} ${path} status=${response.status}`)

    const parsed = await this.handleResponse<T>(response, method, path)
    this.logger.verbose(`Completed Vault request: ${method} ${path} status=${response.status} outcome=${parsed === null ? 'no-content' : 'ok'}`)
    return parsed
  }

  private get apiBaseUrl() {
    return new URL('v1/', this.vaultConfig.internalUrl ?? this.vaultConfig.url).toString()
  }

  private createRequest(path: string, method: string, body?: unknown): Request {
    const url = new URL(path, this.apiBaseUrl).toString()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Vault-Token': this.vaultConfig.token,
    }

    return new Request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  private async handleResponse<T>(response: Response, method: string, path: string): Promise<T | null> {
    if (response.status === HttpStatus.NO_CONTENT) return null

    if (!response.ok) {
      await this.throwForStatus(response, method, path)
    }

    return await response.json()
  }

  private async throwForStatus(response: Response, method: string, path: string): Promise<never> {
    let responseBody: unknown
    try {
      responseBody = await response.json()
    } catch {
      // A non-JSON error body (proxy HTML page) must not escape the VaultError contract.
      responseBody = undefined
    }
    const vaultErrorBody = z.object({ errors: z.array(z.string()) }).safeParse(responseBody)
    const reasons = vaultErrorBody.success ? vaultErrorBody.data.errors : undefined
    const reasonsPart = reasons?.length ? ` reasons=${reasons.join('; ')}` : ''
    this.logger.warn(`Vault request returned error: ${method} ${path} status=${response.status} statusText=${response.statusText}${reasonsPart}`)

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
