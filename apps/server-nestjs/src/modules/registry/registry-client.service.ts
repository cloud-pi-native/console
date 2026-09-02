import type { RegistryQuery, RegistryResponse } from './registry-http-client.service'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { RegistryHttpClientService } from './registry-http-client.service'
import { ROBOT_LIST_PAGE_SIZE } from './registry.constants'
import { ensure, isRegistryConflict } from './registry.utils'

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

export interface HarborAccess {
  resource: string
  action: string
}

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

export interface HarborRepository {
  name?: string
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
    return this.http.fetch<HarborProject>(`projects/${encodeURIComponent(projectName)}`, {
      method: 'GET',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async ensureProject(projectName: string, storageLimit: number) {
    return ensure<HarborProject>({
      create: () => this.http.fetch<HarborProject>('projects', {
        method: 'POST',
        body: {
          project_name: projectName,
          metadata: { auto_scan: 'true' },
          storage_limit: storageLimit,
        },
      }),
      reload: async () => {
        // 201 returns an empty body: fetch by name to obtain the id.
        const response = await this.getProjectByName(projectName)
        if (response.status !== HttpStatus.OK || !response.data) {
          throw new Error(`Harbor get project failed (${response.status})`)
        }
        return response.data
      },
    })
  }

  async deleteProjectByName(projectName: string) {
    return this.http.fetch(`projects/${encodeURIComponent(projectName)}`, {
      method: 'DELETE',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  getRepositories(projectName: string): AsyncGenerator<HarborRepository> {
    return this.paginate<HarborRepository>(`projects/${encodeURIComponent(projectName)}/repositories`)
  }

  async deleteRepository(projectName: string, repositoryName: string) {
    return this.http.fetch(`projects/${encodeURIComponent(projectName)}/repositories/${encodeURIComponent(repositoryName)}`, {
      method: 'DELETE',
    })
  }

  async listQuotas(projectId: number) {
    return this.http.fetch<HarborProjectQuota[]>(`quotas?reference_id=${encodeURIComponent(String(projectId))}`, {
      method: 'GET',
    })
  }

  async updateQuota(projectId: number, storageLimit: number) {
    return this.http.fetch(`quotas/${encodeURIComponent(String(projectId))}`, {
      method: 'PUT',
      body: {
        hard: {
          storage: storageLimit,
        },
      },
    })
  }

  async getGroupMembers(projectName: string) {
    return this.http.fetch<HarborMember[]>(`projects/${encodeURIComponent(projectName)}/members`, {
      method: 'GET',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  async ensureGroupMember(projectName: string, body: HarborGroupMemberRequest) {
    await ensure({
      create: () => this.http.fetch(`projects/${encodeURIComponent(projectName)}/members`, {
        method: 'POST',
        headers: { 'X-Is-Resource-Name': 'true' },
        body,
      }),
      reload: async () => {
        // Re-listing proves the raced membership exists.
        const members = await this.getGroupMembers(projectName)
        if (members.status !== HttpStatus.OK || !members.data) return undefined
        return members.data.find(member => member?.entity_name === body.member_group.group_name)
      },
    })
  }

  async removeGroupMember(projectName: string, memberId: number) {
    return this.http.fetch(`projects/${encodeURIComponent(projectName)}/members/${encodeURIComponent(String(memberId))}`, {
      method: 'DELETE',
      headers: { 'X-Is-Resource-Name': 'true' },
    })
  }

  getProjectRobots(projectId: number): AsyncGenerator<HarborRobot> {
    return this.paginate<HarborRobot>('robots', {
      q: `Level=project,ProjectID=${projectId}`,
    })
  }

  async ensureRobot(body: HarborRobotCreateRequest): Promise<HarborRobotCreated | undefined> {
    const created = await this.http.fetch<HarborRobotCreated>('robots', {
      method: 'POST',
      body,
    })
    if (isRegistryConflict(created)) {
      // The raced robot belongs to the concurrent run that owns its secret —
      // never rotate here; service-level rotation stays the explicit path.
      return undefined
    }
    if (created.status >= HttpStatus.BAD_REQUEST || !created.data) {
      throw new Error(`Harbor create robot failed (${created.status})`)
    }
    return created.data
  }

  async deleteRobot(robotId: number): Promise<RegistryResponse> {
    return this.http.fetch(`robots/${encodeURIComponent(String(robotId))}`, {
      method: 'DELETE',
    })
  }

  async getRetentionId(projectName: string): Promise<number | null> {
    const project = await this.getProjectByName(projectName)
    if (project.status !== 200 || !project.data) return null
    const retentionId = Number(project.data?.metadata?.retention_id)
    return Number.isFinite(retentionId) ? retentionId : null
  }

  async ensureRetention(projectName: string, body: HarborRetentionPolicy): Promise<void> {
    // Harbor keeps a single retention policy per project; a re-sync must not
    // issue a second create. Reconcile the existing policy in place when it exists.
    let retentionId = await this.getRetentionId(projectName)
    if (retentionId === null) {
      const created = await this.createRetention(body)
      if (created.status < HttpStatus.BAD_REQUEST) return
      // A racing sync likely created the policy between our read and create
      // (Harbor signals the duplicate with 400 BAD_REQUEST): re-read its id.
      retentionId = await this.getRetentionId(projectName)
      if (retentionId === null) {
        throw new Error(`Harbor request failed (${created.status})`)
      }
    }
    const updated = await this.updateRetention(retentionId, body)
    if (updated.status >= HttpStatus.BAD_REQUEST) {
      throw new Error(`Harbor retention policy failed (${updated.status})`)
    }
  }

  async createRetention(body: HarborRetentionPolicy) {
    return this.http.fetch<number>('retentions', {
      method: 'POST',
      body,
    })
  }

  async updateRetention(retentionId: number, body: HarborRetentionPolicy) {
    return this.http.fetch(`retentions/${encodeURIComponent(String(retentionId))}`, {
      method: 'PUT',
      body,
    })
  }

  private async* paginate<T>(path: string, query?: RegistryQuery): AsyncGenerator<T> {
    for (let page = 1; ; page++) {
      const response = await this.http.fetch<T[]>(path, {
        method: 'GET',
        query: { ...query, page, page_size: ROBOT_LIST_PAGE_SIZE },
      })
      if (response.status !== 200 || !response.data?.length) return
      yield* response.data
      if (response.data.length < ROBOT_LIST_PAGE_SIZE) return
    }
  }
}
