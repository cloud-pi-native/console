import type { RegistryResponse } from './registry-http-client.service'
import { Inject, Injectable } from '@nestjs/common'
import { RegistryHttpClientService } from './registry-http-client.service'

export interface HarborAccess {
  resource: string
  action: string
}

export const roRobotName = 'ro-robot'
export const rwRobotName = 'rw-robot'
export const projectRobotName = 'project-robot'

export const roAccess: HarborAccess[] = [
  { resource: 'repository', action: 'pull' },
  { resource: 'artifact', action: 'read' },
]

export const rwAccess: HarborAccess[] = [
  ...roAccess,
  { resource: 'repository', action: 'list' },
  { resource: 'tag', action: 'list' },
  { resource: 'artifact', action: 'list' },
  { resource: 'scan', action: 'create' },
  { resource: 'scan', action: 'stop' },
  { resource: 'repository', action: 'push' },
  { resource: 'artifact-label', action: 'create' },
  { resource: 'artifact-label', action: 'delete' },
  { resource: 'tag', action: 'create' },
  { resource: 'tag', action: 'delete' },
]

export interface HarborProject {
  project_id?: number
  metadata?: {
    retention_id?: number | string
  }
}

export interface HarborRobot {
  id?: number
  name?: string
}

export interface HarborRobotCreated {
  id?: number
  name: string
  secret: string
}

export interface HarborMember {
  id?: number
  entity_name?: string
  entity_type?: string
  role_id?: number
}

export interface HarborGroupMemberRequest {
  role_id: number
  member_group: {
    group_name: string
    group_type: number
  }
}

export interface HarborProjectQuota {
  ref?: { id?: number }
  hard?: { storage?: number }
}

export interface HarborRobotPermission {
  namespace: string
  kind: 'project'
  access: HarborAccess[]
}

export interface HarborRobotCreateRequest {
  name: string
  duration: number
  description: string
  disable: boolean
  level: 'project'
  permissions: HarborRobotPermission[]
}

export interface HarborRetentionRule {
  disabled: boolean
  action: 'retain'
  template: string
  params: Record<string, number>
  tag_selectors: Array<{ kind: string, decoration: string, pattern: string }>
  scope_selectors: {
    repository: Array<{ kind: string, decoration: string, pattern: string }>
  }
}

export interface HarborRetentionPolicy {
  algorithm: 'or' | 'and'
  scope: { level: 'project', ref: number }
  rules: HarborRetentionRule[]
  trigger: {
    kind: 'Schedule'
    settings: { cron?: string }
    references: unknown[]
  }
}

@Injectable()
export class RegistryClientService {
  constructor(
    @Inject(RegistryHttpClientService) private readonly http: RegistryHttpClientService,
  ) {}

  async getProjectByName(projectName: string): Promise<RegistryResponse<HarborProject>> {
    return this.http.fetch<HarborProject>(generateApiUrl(`/projects/${encodeURIComponent(projectName)}`), {
      method: 'GET',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async createProject(projectName: string, storageLimit: number) {
    return this.http.fetch(generateApiUrl('/projects'), {
      method: 'POST',
      body: {
        project_name: projectName,
        metadata: { auto_scan: 'true' },
        storage_limit: storageLimit,
      },
    })
  }

  async deleteProjectByName(projectName: string) {
    return this.http.fetch(generateApiUrl(`/projects/${encodeURIComponent(projectName)}`), {
      method: 'DELETE',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async listQuotas(projectId: number) {
    return this.http.fetch<HarborProjectQuota[]>(generateApiUrl(`/quotas?reference_id=${encodeURIComponent(String(projectId))}`), {
      method: 'GET',
    })
  }

  async updateQuota(projectId: number, storageLimit: number) {
    return this.http.fetch(generateApiUrl(`/quotas/${encodeURIComponent(String(projectId))}`), {
      method: 'PUT',
      body: {
        hard: {
          storage: storageLimit,
        },
      },
    })
  }

  async getGroupMembers(projectName: string) {
    return this.http.fetch<HarborMember[]>(generateApiUrl(`/projects/${encodeURIComponent(projectName)}/members`), {
      method: 'GET',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async addGroupMember(projectName: string, body: HarborGroupMemberRequest) {
    return this.http.fetch(generateApiUrl(`/projects/${encodeURIComponent(projectName)}/members`), {
      method: 'POST',
      headers: { 'X-Is-Resource-Name': 'true' },
      body,
    })
  }

  async removeGroupMember(projectName: string, memberId: number) {
    return this.http.fetch(generateApiUrl(`/projects/${encodeURIComponent(projectName)}/members/${encodeURIComponent(String(memberId))}`), {
      method: 'DELETE',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async getProjectRobots(projectName: string) {
    return this.http.fetch<HarborRobot[]>(generateApiUrl(`/projects/${encodeURIComponent(projectName)}/robots`), {
      method: 'GET',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async createRobot(body: HarborRobotCreateRequest) {
    return this.http.fetch<HarborRobotCreated>(generateApiUrl('/robots'), {
      method: 'POST',
      body,
    })
  }

  async deleteRobot(projectName: string, robotId: number) {
    const direct = await this.http.fetch(generateApiUrl(`/robots/${encodeURIComponent(String(robotId))}`), {
      method: 'DELETE',
    })
    if (direct.status < 300 || direct.status === 404) return direct

    return this.http.fetch(generateApiUrl(`/projects/${encodeURIComponent(projectName)}/robots/${encodeURIComponent(String(robotId))}`), {
      method: 'DELETE',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async getRetentionId(projectName: string): Promise<number | null> {
    const project = await this.getProjectByName(projectName)
    if (project.status !== 200 || !project.data) return null
    const retentionId = Number(project.data?.metadata?.retention_id)
    return Number.isFinite(retentionId) ? retentionId : null
  }

  async createRetention(body: HarborRetentionPolicy) {
    return this.http.fetch(generateApiUrl('/retentions'), {
      method: 'POST',
      body,
    })
  }

  async updateRetention(retentionId: number, body: HarborRetentionPolicy) {
    return this.http.fetch(generateApiUrl(`/retentions/${encodeURIComponent(String(retentionId))}`), {
      method: 'PUT',
      body,
    })
  }
}

function generateApiUrl(path: string) {
  return `/api/v2.0${path}`
}
