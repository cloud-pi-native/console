import type { RegistryQuery, RegistryResponse } from './registry-http-client.service'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { RegistryHttpClientService } from './registry-http-client.service'
import { ROBOT_LIST_PAGE_SIZE } from './registry.constants'
import { ensure } from './registry.utils'

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

  async ensureProject(projectName: string, storageLimit: number): Promise<HarborProject> {
    const created = await ensure<HarborProject>({
      create: () => this.http.fetch<HarborProject>('projects', {
        method: 'POST',
        body: {
          project_name: projectName,
          metadata: { auto_scan: 'true' },
          storage_limit: storageLimit,
        },
      }),
      reload: async () => {
        const existing = await this.getProjectByName(projectName)
        return existing.status === HttpStatus.OK ? existing.data : null
      },
    })
    if (created) return created
    // Harbor answers 201 with an empty body on a fresh creation: fetch the
    // project to obtain its id.
    const fetched = await this.getProjectByName(projectName)
    if (fetched.status !== HttpStatus.OK || !fetched.data) {
      throw new Error(`Harbor get project failed (${fetched.status})`)
    }
    return fetched.data
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
        // Membership collision: Harbor already holds what the concurrent run
        // created; re-listing proves it and adds no other state to reconcile.
        const members = await this.getGroupMembers(projectName)
        if (members.status !== HttpStatus.OK || !members.data) return null
        return members.data.find(member => member?.entity_name === body.member_group.group_name) ?? null
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

  async ensureRobot(body: HarborRobotCreateRequest): Promise<HarborRobotCreated | null> {
    return ensure<HarborRobotCreated>({
      create: () => this.http.fetch<HarborRobotCreated>('robots', {
        method: 'POST',
        body,
      }),
      reload: async () => {
        // 409 race: a concurrent run created the robot. Harbor never re-serves
        // a robot secret, so reconciling means rotating: delete the existing
        // robot and recreate it to obtain a fresh usable secret.
        const existing = await this.findRobot(body)
        if (existing?.id) {
          await this.deleteRobot(existing.id)
        }
        const recreated = await this.http.fetch<HarborRobotCreated>('robots', {
          method: 'POST',
          body,
        })
        return recreated.status < HttpStatus.BAD_REQUEST ? recreated.data : null
      },
    })
  }

  private async findRobot(body: HarborRobotCreateRequest): Promise<HarborRobot | undefined> {
    const namespace = body.permissions[0]?.namespace
    if (!namespace) return undefined
    const fullName = `robot$${namespace}+${body.name}`
    const project = await this.getProjectByName(namespace)
    if (project.status !== HttpStatus.OK || !project.data) return undefined
    const projectId = Number(project.data.project_id)
    if (!Number.isFinite(projectId)) return undefined
    for await (const robot of this.getProjectRobots(projectId)) {
      if (robot?.name === fullName) return robot
    }
    return undefined
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

  async ensureRetention(projectName: string, body: HarborRetentionPolicy) {
    return ensure<unknown>({
      create: () => this.createRetention(body),
      reload: async () => {
        const racedId = await this.getRetentionId(projectName)
        if (!racedId) return null
        const result = await this.updateRetention(racedId, body)
        if (result.status >= HttpStatus.BAD_REQUEST) {
          throw new Error(`Harbor retention policy failed (${result.status})`)
        }
        return null
      },
    })
  }

  async createRetention(body: HarborRetentionPolicy) {
    return this.http.fetch('retentions', {
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
