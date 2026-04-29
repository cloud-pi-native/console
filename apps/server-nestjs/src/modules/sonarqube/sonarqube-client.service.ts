import { Inject, Injectable } from '@nestjs/common'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { SonarqubeHttpClientService } from './sonarqube-http-client.service'

export interface SonarqubePaging {
  pageIndex: number
  pageSize: number
  total: number
}

export interface SonarqubeGroup {
  id: string
  name: string
  description: string
  membersCount: number
  default: boolean
}

export interface SonarqubeUser {
  login: string
  name: string
  active: boolean
  email: string
  groups: string[]
  tokensCount: number
  local: boolean
  externalIdentity: string
  externalProvider: string
  managed: boolean
}

export type SonarqubeProjectQualifier = 'BRC' | 'DIR' | 'FIL' | 'TRK' | 'UTS'

export interface SonarqubeProject {
  key: string
  name: string
  qualifier: SonarqubeProjectQualifier
  visibility: 'private' | 'public'
  lastAnalysisDate?: string
  revision?: string
}

export interface SonarqubeProjectResult {
  projectSlug: string
  repository: string
  key: string
}

export interface SonarqubeGeneratedToken {
  token: string
  login: string
  name: string
}

@Injectable()
export class SonarqubeClientService {
  constructor(
    @Inject(SonarqubeHttpClientService) private readonly http: SonarqubeHttpClientService,
  ) {}

  @StartActiveSpan()
  searchUserGroups(params: { q?: string, p?: number, ps?: number }) {
    return this.http.fetch<{ paging: SonarqubePaging, groups: SonarqubeGroup[] }>('user_groups/search', { params }).then(res => res.data!)
  }

  @StartActiveSpan()
  async createUserGroups(params: { name: string, description?: string }) {
    await this.http.fetch('user_groups/create', { method: 'POST', params })
  }

  @StartActiveSpan()
  async createPermissionTemplate(params: { name: string }) {
    await this.http.fetch('permissions/create_template', { method: 'POST', params })
  }

  @StartActiveSpan()
  async setPermissionDefaultTemplate(params: { templateName: string }) {
    await this.http.fetch('permissions/set_default_template', { method: 'POST', params })
  }

  @StartActiveSpan()
  async addPermissionProjectCreatorToTemplate(params: { templateName: string, permission: string }) {
    await this.http.fetch('permissions/add_project_creator_to_template', { method: 'POST', params })
  }

  @StartActiveSpan()
  async addPermissionGroupToTemplate(params: { groupName: string, templateName: string, permission: string }) {
    await this.http.fetch('permissions/add_group_to_template', { method: 'POST', params })
  }

  @StartActiveSpan()
  async addPermissionGroup(params: { groupName: string, permission: string, projectKey?: string }) {
    await this.http.fetch('permissions/add_group', { method: 'POST', params })
  }

  @StartActiveSpan()
  async addPermissionUser(params: { projectKey: string, permission: string, login: string }) {
    await this.http.fetch('permissions/add_user', { method: 'POST', params })
  }

  @StartActiveSpan()
  searchUsers(params: { q?: string, p?: number, ps?: number }) {
    return this.http.fetch<{ paging: SonarqubePaging, users: SonarqubeUser[] }>('users/search', { params }).then(res => res.data!)
  }

  @StartActiveSpan()
  async createUser(params: { email: string, local: string, login: string, name: string, password: string }) {
    await this.http.fetch('users/create', { method: 'POST', params })
  }

  @StartActiveSpan()
  async deactivateUser(params: { login: string, anonymize: boolean }) {
    await this.http.fetch('users/deactivate', { method: 'POST', params })
  }

  @StartActiveSpan()
  async revokeUserToken(params: { login: string, name: string }) {
    await this.http.fetch('user_tokens/revoke', { method: 'POST', params })
  }

  @StartActiveSpan()
  generateUserToken(params: { login: string, name: string }) {
    return this.http.fetch<SonarqubeGeneratedToken>('user_tokens/generate', { method: 'POST', params }).then(res => res.data!)
  }

  @StartActiveSpan()
  searchProject(params: { q?: string, p?: number, ps?: number }) {
    return this.http.fetch<{ paging: SonarqubePaging, components: SonarqubeProject[] }>('projects/search', { params }).then(res => res.data!)
  }

  @StartActiveSpan()
  async createProject(params: { project: string, visibility: string, name: string, mainbranch: string }) {
    await this.http.fetch('projects/create', { method: 'POST', params })
  }

  @StartActiveSpan()
  async deleteProject(params: { project: string }) {
    await this.http.fetch('projects/delete', { method: 'POST', params })
  }
}
