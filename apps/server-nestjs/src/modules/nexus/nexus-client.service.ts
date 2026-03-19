import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'

interface NexusRepositoryStorage {
  blobStoreName: string
  strictContentTypeValidation: boolean
  writePolicy?: string
}

interface NexusRepositoryCleanup {
  policyNames: string[]
}

interface NexusRepositoryComponent {
  proprietaryComponents: boolean
}

interface NexusRepositoryGroup {
  memberNames: string[]
}

interface NexusMavenHostedRepositoryUpsertRequest {
  name: string
  online: boolean
  storage: NexusRepositoryStorage & { writePolicy: string }
  cleanup: NexusRepositoryCleanup
  component: NexusRepositoryComponent
  maven: {
    versionPolicy: string
    layoutPolicy: string
    contentDisposition: string
  }
}

interface NexusMavenGroupRepositoryUpsertRequest {
  name: string
  online: boolean
  storage: Omit<NexusRepositoryStorage, 'writePolicy'>
  group: NexusRepositoryGroup
}

interface NexusNpmHostedRepositoryUpsertRequest {
  name: string
  online: boolean
  storage: NexusRepositoryStorage & { writePolicy: string }
  cleanup: NexusRepositoryCleanup
  component: NexusRepositoryComponent
}

interface NexusNpmGroupRepositoryUpsertRequest {
  name: string
  online: boolean
  storage: Omit<NexusRepositoryStorage, 'writePolicy'>
  group: NexusRepositoryGroup
}

interface NexusRepositoryViewPrivilegeUpsertRequest {
  name: string
  description: string
  actions: string[]
  format: string
  repository: string
}

interface NexusRoleCreateRequest {
  id: string
  name: string
  description: string
  privileges: string[]
}

interface NexusRoleUpdateRequest {
  id: string
  name: string
  privileges: string[]
}

interface NexusUserCreateRequest {
  userId: string
  firstName: string
  lastName: string
  emailAddress: string
  password: string
  status: string
  roles: string[]
}

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

  private createRequest(path: string, method: string, body?: unknown, extraHeaders?: Record<string, string>): Request {
    const url = new URL(path, this.baseUrl).toString()
    const headers: Record<string, string> = {
      Authorization: `Basic ${this.basicAuth}`,
      ...extraHeaders,
    }
    let requestBody: string | undefined
    if (body !== undefined) {
      if (typeof body === 'string') {
        requestBody = body
        headers['Content-Type'] = 'text/plain'
      } else {
        requestBody = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
      }
    }
    return new Request(url, { method, headers, body: requestBody })
  }

  @StartActiveSpan()
  async getRepositoriesMavenHosted(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/repositories/maven/hosted/${name}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createRepositoriesMavenHosted(body: NexusMavenHostedRepositoryUpsertRequest): Promise<void> {
    await this.fetch('/repositories/maven/hosted', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateRepositoriesMavenHosted(name: string, body: NexusMavenHostedRepositoryUpsertRequest): Promise<void> {
    await this.fetch(`/repositories/maven/hosted/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async createRepositoriesMavenGroup(body: NexusMavenGroupRepositoryUpsertRequest): Promise<void> {
    await this.fetch('/repositories/maven/group', { method: 'POST', body })
  }

  @StartActiveSpan()
  async getRepositoriesMavenGroup(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/repositories/maven/group/${name}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async getRepositoriesNpmHosted(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/repositories/npm/hosted/${name}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createRepositoriesNpmHosted(body: NexusNpmHostedRepositoryUpsertRequest): Promise<void> {
    await this.fetch('/repositories/npm/hosted', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateRepositoriesNpmHosted(name: string, body: NexusNpmHostedRepositoryUpsertRequest): Promise<void> {
    await this.fetch(`/repositories/npm/hosted/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getRepositoriesNpmGroup(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/repositories/npm/group/${name}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async postRepositoriesNpmGroup(body: NexusNpmGroupRepositoryUpsertRequest): Promise<void> {
    await this.fetch('/repositories/npm/group', { method: 'POST', body })
  }

  @StartActiveSpan()
  async putRepositoriesNpmGroup(name: string, body: NexusNpmGroupRepositoryUpsertRequest): Promise<void> {
    await this.fetch(`/repositories/npm/group/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async getSecurityPrivileges(name: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/security/privileges/${name}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createSecurityPrivilegesRepositoryView(body: NexusRepositoryViewPrivilegeUpsertRequest): Promise<void> {
    await this.fetch('/security/privileges/repository-view', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateSecurityPrivilegesRepositoryView(name: string, body: NexusRepositoryViewPrivilegeUpsertRequest): Promise<void> {
    await this.fetch(`/security/privileges/repository-view/${name}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityPrivileges(name: string): Promise<void> {
    try {
      await this.fetch(`/security/privileges/${name}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async getSecurityRoles(id: string): Promise<any | null> {
    try {
      const res = await this.fetch(`/security/roles/${id}`, { method: 'GET' })
      return res.data
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return null
      throw error
    }
  }

  @StartActiveSpan()
  async createSecurityRoles(body: NexusRoleCreateRequest): Promise<void> {
    await this.fetch('/security/roles', { method: 'POST', body })
  }

  @StartActiveSpan()
  async updateSecurityRoles(id: string, body: NexusRoleUpdateRequest): Promise<void> {
    await this.fetch(`/security/roles/${id}`, { method: 'PUT', body })
  }

  @StartActiveSpan()
  async deleteSecurityRoles(id: string): Promise<void> {
    try {
      await this.fetch(`/security/roles/${id}`, { method: 'DELETE' })
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
    await this.fetch(`/security/users/${userId}/change-password`, {
      method: 'PUT',
      body: password,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  @StartActiveSpan()
  async createSecurityUsers(body: NexusUserCreateRequest): Promise<void> {
    await this.fetch('/security/users', { method: 'POST', body })
  }

  @StartActiveSpan()
  async deleteSecurityUsers(userId: string): Promise<void> {
    try {
      await this.fetch(`/security/users/${userId}`, { method: 'DELETE' })
    } catch (error) {
      if (error instanceof NexusError && error.status === 404) return
      throw error
    }
  }

  @StartActiveSpan()
  async deleteRepositoriesByName(name: string): Promise<void> {
    try {
      await this.fetch(`/repositories/${name}`, { method: 'DELETE' })
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
