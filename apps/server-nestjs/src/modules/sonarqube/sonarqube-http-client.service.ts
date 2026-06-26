import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'

export interface SonarqubeFetchOptions {
  method?: string
  params?: Record<string, string | number | boolean | undefined | null>
}

export interface SonarqubeResponse<T = unknown> {
  status: HttpStatus
  data: T | null
}

export type SonarqubeErrorKind = 'NotConfigured' | 'ClientError' | 'ServerError' | 'Unexpected'

export class SonarqubeError extends Error {
  readonly kind: SonarqubeErrorKind
  readonly status?: HttpStatus
  readonly method?: string
  readonly path?: string

  constructor(
    kind: SonarqubeErrorKind,
    message: string,
    details: { status?: HttpStatus, method?: string, path?: string } = {},
  ) {
    super(message)
    this.name = 'SonarqubeError'
    this.kind = kind
    this.status = details.status
    this.method = details.method
    this.path = details.path
  }
}

@Injectable()
export class SonarqubeHttpClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  private get baseUrl(): string {
    const url = this.config.getInternalOrPublicSonarqubeUrl()
    if (!url) throw new SonarqubeError('NotConfigured', 'SONARQUBE_URL or SONARQUBE_INTERNAL_URL is required')
    return url
  }

  private get apiBaseUrl(): string {
    return new URL('api/', this.baseUrl).toString()
  }

  private get defaultHeaders(): Record<string, string> {
    if (!this.config.sonarApiToken) throw new SonarqubeError('NotConfigured', 'SONAR_API_TOKEN is required')
    return {
      Authorization: `Bearer ${this.config.sonarApiToken}`,
    }
  }

  async fetch<T = unknown>(path: string, options: SonarqubeFetchOptions = {}): Promise<SonarqubeResponse<T>> {
    const span = trace.getActiveSpan()
    const method = (options.method ?? 'GET').toUpperCase()
    span?.setAttribute('sonarqube.method', method)
    span?.setAttribute('sonarqube.path', path)

    const request = this.createRequest(path, method, options.params)
    const response = await fetch(request).catch((error) => {
      throw new SonarqubeError('Unexpected', error instanceof Error ? error.message : String(error), { method, path })
    })

    span?.setAttribute('sonarqube.http.status', response.status)
    const result = await handleResponse<T>(response)
    if (response.status >= 400) {
      const kind = response.status >= 500 ? 'ServerError' : 'ClientError'
      throw new SonarqubeError(kind, formatErrorMessage(response.status, result.data), { status: response.status, method, path })
    }
    return result
  }

  private createRequest(path: string, method: string, params?: Record<string, string | number | boolean | undefined | null>): Request {
    const url = new URL(path, this.apiBaseUrl)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) url.searchParams.append(key, String(value))
      }
    }
    return new Request(url.toString(), { method, headers: this.defaultHeaders })
  }
}

function formatErrorMessage(status: number, data: unknown): string {
  const errors = (data as { errors?: { msg?: unknown }[] } | null)?.errors
  const details = Array.isArray(errors)
    ? errors.map(e => e?.msg).filter((msg): msg is string => typeof msg === 'string').join('; ')
    : ''
  return details
    ? `SonarQube API responded with status ${status}: ${details}`
    : `SonarQube API responded with status ${status}`
}

async function handleResponse<T>(response: Response): Promise<SonarqubeResponse<T>> {
  if (response.status === HttpStatus.NO_CONTENT) return { status: response.status, data: null }
  const contentType = response.headers.get('content-type') ?? ''
  const parsed = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  return { status: response.status, data: parsed as T }
}
