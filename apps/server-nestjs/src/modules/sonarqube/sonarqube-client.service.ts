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

type BaseParams = Record<string, string | number | boolean | undefined>

export interface SearchUserGroupParams extends BaseParams {
  q?: string
  p?: number
  ps?: number
}

export interface CreateUserGroupParams extends BaseParams {
  name: string
  description?: string
}

export interface CreatePermissionTemplateParams extends BaseParams {
  name: string
  description?: string
  projectKeyPattern?: string
}

export interface SetPermissionDefaultTemplateParams extends BaseParams {
  templateName: string
  projectKeyPattern?: string
}

export interface AddPermissionProjectCreatorToTemplateParams extends BaseParams {
  templateName: string
  permission: string
}

export interface AddPermissionGroupToTemplateParams extends BaseParams {
  groupName: string
  templateName: string
  permission: string
}

export interface AddPermissionGroupParams extends BaseParams {
  groupName: string
  permission: string
  projectKey?: string
}

export interface AddPermissionUserParams extends BaseParams {
  projectKey: string
  permission: string
  login: string
}

export interface SearchUsersParams extends BaseParams {
  q?: string
  p?: number
  ps?: number
}

export interface CreateUserParams extends BaseParams {
  email: string
  local: string
  login: string
  name: string
  password: string
}

export interface DeactivateUserParams extends BaseParams {
  login: string
  anonymize: boolean
}

export interface RevokeUserTokenParams extends BaseParams {
  login: string
  name: string
}

export interface GenerateUserTokenParams extends BaseParams {
  login: string
  name: string
}

export interface SearchProjectParams extends BaseParams {
  q?: string
  p?: number
  ps?: number
}

export interface CreateProjectParams extends BaseParams {
  project: string
  visibility: string
  name: string
  mainbranch: string
}

export interface DeleteProjectParams extends BaseParams {
  project: string
}

export interface SearchUserGroupResponse {
  paging: SonarqubePaging
  groups: SonarqubeGroup[]
}

export interface SearchUsersResponse {
  paging: SonarqubePaging
  users: SonarqubeUser[]
}

export interface SearchProjectResponse {
  paging: SonarqubePaging
  components: SonarqubeProject[]
}

@Injectable()
export class SonarqubeClientService {
  constructor(
    @Inject(SonarqubeHttpClientService) private readonly http: SonarqubeHttpClientService,
  ) {}

  @StartActiveSpan()
  searchUserGroup(params: SearchUserGroupParams) {
    return this.http.fetch<SearchUserGroupResponse>('user_groups/search', { params }).then(res => res.data!)
  }

  @StartActiveSpan()
  async createUserGroup(params: CreateUserGroupParams) {
    await this.http.fetch('user_groups/create', { method: 'POST', params })
  }

  @StartActiveSpan()
  async createPermissionTemplate(params: CreatePermissionTemplateParams) {
    await this.http.fetch('permissions/create_template', { method: 'POST', params })
  }

  @StartActiveSpan()
  async setPermissionDefaultTemplate(params: SetPermissionDefaultTemplateParams) {
    await this.http.fetch('permissions/set_default_template', { method: 'POST', params })
  }

  @StartActiveSpan()
  async addPermissionProjectCreatorToTemplate(params: AddPermissionProjectCreatorToTemplateParams) {
    await this.http.fetch('permissions/add_project_creator_to_template', { method: 'POST', params })
  }

  @StartActiveSpan()
  async addPermissionGroupToTemplate(params: AddPermissionGroupToTemplateParams) {
    await this.http.fetch('permissions/add_group_to_template', { method: 'POST', params })
  }

  @StartActiveSpan()
  async addPermissionGroup(params: AddPermissionGroupParams) {
    await this.http.fetch('permissions/add_group', { method: 'POST', params })
  }

  @StartActiveSpan()
  async addPermissionUser(params: AddPermissionUserParams) {
    await this.http.fetch('permissions/add_user', { method: 'POST', params })
  }

  @StartActiveSpan()
  searchUsers(params: SearchUsersParams) {
    return this.http.fetch<SearchUsersResponse>('users/search', { params }).then(res => res.data!)
  }

  @StartActiveSpan()
  async createUser(params: CreateUserParams) {
    await this.http.fetch('users/create', { method: 'POST', params })
  }

  @StartActiveSpan()
  async deactivateUser(params: DeactivateUserParams) {
    await this.http.fetch('users/deactivate', { method: 'POST', params })
  }

  @StartActiveSpan()
  async revokeUserToken(params: RevokeUserTokenParams) {
    await this.http.fetch('user_tokens/revoke', { method: 'POST', params })
  }

  @StartActiveSpan()
  generateUserToken(params: GenerateUserTokenParams) {
    return this.http.fetch<SonarqubeGeneratedToken>('user_tokens/generate', { method: 'POST', params }).then(res => res.data!)
  }

  @StartActiveSpan()
  searchProject(params: SearchProjectParams) {
    return this.http.fetch<SearchProjectResponse>('projects/search', { params }).then(res => res.data!)
  }

  @StartActiveSpan()
  async createProject(params: CreateProjectParams) {
    await this.http.fetch('projects/create', { method: 'POST', params })
  }

  @StartActiveSpan()
  async deleteProject(params: DeleteProjectParams) {
    await this.http.fetch('projects/delete', { method: 'POST', params })
  }
}
