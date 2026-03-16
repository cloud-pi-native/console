import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import { encodeBasicAuth, removeTrailingSlash } from './registry.utils'

interface HarborRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
}

@Injectable()
export class RegistryClientService {
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

  async request<T = any>(
    path: string,
    options: HarborRequestOptions = {},
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

  async getProjectByName(projectName: string) {
    return this.request(`/projects/${encodeURIComponent(projectName)}`, {
      method: 'GET',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async createProject(projectName: string, storageLimit: number) {
    return this.request('/projects', {
      method: 'POST',
      body: {
        project_name: projectName,
        metadata: { auto_scan: 'true' },
        storage_limit: storageLimit,
      },
    })
  }

  async deleteProject(projectName: string) {
    return this.request(`/projects/${encodeURIComponent(projectName)}`, {
      method: 'DELETE',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async listQuotas(projectId: number) {
    return this.request(`/quotas?reference_id=${encodeURIComponent(String(projectId))}`, {
      method: 'GET',
    })
  }

  async updateQuota(projectId: number, storageLimit: number) {
    return this.request(`/quotas/${encodeURIComponent(String(projectId))}`, {
      method: 'PUT',
      body: {
        hard: {
          storage: storageLimit,
        },
      },
    })
  }

  async listProjectMembers(projectName: string) {
    return this.request(`/projects/${encodeURIComponent(projectName)}/members`, {
      method: 'GET',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async createProjectMember(projectName: string, body: any) {
    return this.request(`/projects/${encodeURIComponent(projectName)}/members`, {
      method: 'POST',
      headers: { 'X-Is-Resource-Name': 'true' },
      body,
    })
  }

  async deleteProjectMember(projectName: string, memberId: number) {
    return this.request(`/projects/${encodeURIComponent(projectName)}/members/${encodeURIComponent(String(memberId))}`, {
      method: 'DELETE',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async listProjectRobots(projectName: string) {
    return this.request(`/projects/${encodeURIComponent(projectName)}/robots`, {
      method: 'GET',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async createRobot(body: any) {
    return this.request('/robots', {
      method: 'POST',
      body,
    })
  }

  async deleteRobot(projectName: string, robotId: number) {
    const direct = await this.request(`/robots/${encodeURIComponent(String(robotId))}`, {
      method: 'DELETE',
    })
    if (direct.status < 300 || direct.status === 404) return direct

    return this.request(`/projects/${encodeURIComponent(projectName)}/robots/${encodeURIComponent(String(robotId))}`, {
      method: 'DELETE',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async getRetentionId(projectName: string): Promise<number | null> {
    const project = await this.getProjectByName(projectName)
    if (project.status !== 200 || !project.data) return null
    const retentionId = Number((project.data as any)?.metadata?.retention_id)
    return Number.isFinite(retentionId) ? retentionId : null
  }

  async createRetention(body: any) {
    return this.request('/retentions', {
      method: 'POST',
      body,
    })
  }

  async updateRetention(retentionId: number, body: any) {
    return this.request(`/retentions/${encodeURIComponent(String(retentionId))}`, {
      method: 'PUT',
      body,
    })
  }
}
