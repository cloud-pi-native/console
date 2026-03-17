import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { StartActiveSpan } from '@/cpin-module/infrastructure/telemetry/telemetry.decorator'

interface NexusFetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

interface NexusResponse<T = unknown> {
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
export class NexusClientService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  @StartActiveSpan()
  private async fetch<T = unknown>(path: string, options: NexusFetchOptions = {}): Promise<NexusResponse<T>> {
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
    const result = await handleNexusResponse<T>(response)
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
    return new URL('service/rest/v1/', this.config.nexusInternalUrl).toString()
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

  private get defaultHeaders() {
    return {
      Accept: 'application/json',
      Authorization: `Basic ${this.basicAuth}`,
    } as const
  }

  private createRequest(path: string, method: string, body?: unknown, extraHeaders?: Record<string, string>): Request {
    const url = new URL(path, this.baseUrl).toString()
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...extraHeaders,
    }
    let requestBody: string | undefined
    if (body !== undefined) {
      if (typeof body === 'string') {
        requestBody = body
      } else {
        requestBody = JSON.stringify(body)
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
      }
    }
    return new Request(url, { method, headers, body: requestBody })
  }

  @StartActiveSpan()
  async getRepositoriesMavenHosted(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/repositories/maven/hosted/${encodeURIComponent(name)}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async postRepositoriesMavenHosted(body: any): Promise<void> {
    await this.fetch('/repositories/maven/hosted', { method: 'POST', body })
  }

  @StartActiveSpan()
  async putRepositoriesMavenHosted(name: string, body: any): Promise<void> {
    await this.fetch(`/repositories/maven/hosted/${encodeURIComponent(name)}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async postRepositoriesMavenGroup(body: any): Promise<void> {
    await this.fetch('/repositories/maven/group', { method: 'POST', body })
  }

  @StartActiveSpan()
  async getRepositoriesMavenGroup(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/repositories/maven/group/${encodeURIComponent(name)}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async getRepositoriesNpmHosted(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/repositories/npm/hosted/${encodeURIComponent(name)}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async postRepositoriesNpmHosted(body: any): Promise<void> {
    await this.fetch('/repositories/npm/hosted', { method: 'POST', body })
  }

  @StartActiveSpan()
  async putRepositoriesNpmHosted(name: string, body: any): Promise<void> {
    await this.fetch(`/repositories/npm/hosted/${encodeURIComponent(name)}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getRepositoriesNpmGroup(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/repositories/npm/group/${encodeURIComponent(name)}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async postRepositoriesNpmGroup(body: any): Promise<void> {
    await this.fetch('/repositories/npm/group', { method: 'POST', body })
  }

  @StartActiveSpan()
  async putRepositoriesNpmGroup(name: string, body: any): Promise<void> {
    await this.fetch(`/repositories/npm/group/${encodeURIComponent(name)}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getSecurityPrivileges(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/security/privileges/${encodeURIComponent(name)}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async postSecurityPrivilegesRepositoryView(body: any): Promise<void> {
    await this.fetch('/security/privileges/repository-view', { method: 'POST', body })
  }

  @StartActiveSpan()
  async putSecurityPrivilegesRepositoryView(name: string, body: any): Promise<void> {
    await this.fetch(`/security/privileges/repository-view/${encodeURIComponent(name)}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityPrivileges(name: string): Promise<void> {
    try {
      await this.fetch(`/security/privileges/${encodeURIComponent(name)}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async getSecurityRoles(id: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/security/roles/${encodeURIComponent(id)}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async postSecurityRoles(body: any): Promise<void> {
    await this.fetch('/security/roles', { method: 'POST', body })
  }

  @StartActiveSpan()
  async putSecurityRoles(id: string, body: any): Promise<void> {
    await this.fetch(`/security/roles/${encodeURIComponent(id)}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityRoles(id: string): Promise<void> {
    try {
      await this.fetch(`/security/roles/${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async getSecurityUsers(userId: string): Promise<{ userId: string }[]> {
    const query = new URLSearchParams({ userId }).toString()
    const res = await this.fetch<{ userId: string }[]>(`/security/users?${query}`, { method: 'GET' })
    return (res.data as any) ?? []
  }

  @StartActiveSpan()
  async updateSecurityUsersChangePassword(userId: string, password: string): Promise<void> {
    await this.fetch(`/security/users/${encodeURIComponent(userId)}/change-password`, {
      method: 'PUT',
      body: password,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  @StartActiveSpan()
  async createSecurityUsers(body: any): Promise<void> {
    await this.fetch('/security/users', { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSecurityUsers(userId: string): Promise<void> {
    try {
      await this.fetch(`/security/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async deleteRepositoriesByName(name: string): Promise<void> {
    try {
      await this.fetch(`/repositories/${encodeURIComponent(name)}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }
}

async function handleNexusResponse<T>(response: Response): Promise<NexusResponse<T>> {
  if (response.status === 204) return { status: response.status, data: null }
  const contentType = response.headers.get('content-type') ?? ''
  const parsed = contentType.includes('application/json')
    ? await response.json()
    : await response.text()
  return { status: response.status, data: parsed as T }
}
