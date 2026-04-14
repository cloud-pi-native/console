import type {
  BranchSchema,
  CommitAction,
  CondensedProjectSchema,
  GitlabListResponse,
  GroupAccessTokenCreateResponse,
  GroupAccessTokenSchema,
  GroupSchema,
  MemberSchema,
  PipelineSchema,
  PipelineTriggerTokenSchema,
  ProjectSchema,
  RepositoryFileExpandedSchema,
  SimpleUserSchema,
  VariableSchema,
  Visibility,
} from './types.js'
import { encodePathSegment, GitlabHttpError } from './http.js'
import { parseOffsetPagination } from './pagination.js'

const trailingSlashRegexp = /\/$/

export interface GitlabClientConfig {
  host: string
  token: string
}

export interface GitlabRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  tokenOverride?: string
  headers?: Record<string, string | undefined>
}

export class GitlabClient {
  public readonly host: string
  private readonly token: string

  constructor(config: GitlabClientConfig) {
    this.host = config.host.replace(trailingSlashRegexp, '')
    this.token = config.token
  }

  private makeUrl(path: string, query?: GitlabRequestOptions['query']) {
    const url = new URL(`${this.host}${path}`)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (typeof value === 'undefined') continue
        url.searchParams.set(key, String(value))
      }
    }
    return url
  }

  private async requestRaw(path: string, options: GitlabRequestOptions = {}) {
    const method = options.method ?? 'GET'
    const url = this.makeUrl(path, options.query)
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...(options.headers ?? {}),
    }

    const token = options.tokenOverride ?? this.token
    if (token) headers['private-token'] = token

    let body: RequestInit['body'] | undefined
    if (typeof options.body !== 'undefined') {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(options.body)
    }

    const res = await fetch(url, { method, headers, body })
    const text = await res.text()
    if (!res.ok) {
      throw new GitlabHttpError({
        status: res.status,
        method,
        url: url.toString(),
        description: text,
      })
    }

    const contentType = res.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json')
    const data = text && isJson ? JSON.parse(text) : undefined
    return { data, headers: res.headers }
  }

  private async requestJson<T>(path: string, options: GitlabRequestOptions = {}): Promise<{ data: T, headers: Headers }> {
    const { data, headers } = await this.requestRaw(path, options)
    return { data: data as T, headers }
  }

  async groupsAll(query: GitlabRequestOptions['query'] = {}, page?: number, perPage?: number): Promise<GitlabListResponse<GroupSchema>> {
    const { data, headers } = await this.requestJson<GroupSchema[]>('/api/v4/groups', {
      query: { ...query, page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async groupsShow(groupId: number | string) {
    const { data } = await this.requestJson<GroupSchema>(`/api/v4/groups/${encodePathSegment(String(groupId))}`)
    return data
  }

  async groupsAllSubgroups(groupId: number, query: GitlabRequestOptions['query'] = {}, page?: number, perPage?: number): Promise<GitlabListResponse<GroupSchema>> {
    const { data, headers } = await this.requestJson<GroupSchema[]>(`/api/v4/groups/${groupId}/subgroups`, {
      query: { ...query, page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async groupsAllProjects(groupId: number, query: GitlabRequestOptions['query'] = {}, page?: number, perPage?: number): Promise<GitlabListResponse<CondensedProjectSchema>> {
    const { data, headers } = await this.requestJson<CondensedProjectSchema[]>(`/api/v4/groups/${groupId}/projects`, {
      query: { ...query, page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async groupsCreate(name: string, path: string, args: { parentId?: number, visibility?: Visibility, projectCreationLevel?: string, subgroupCreationLevel?: string, defaultBranchProtection?: number, description?: string } = {}): Promise<GroupSchema> {
    const { data } = await this.requestJson<GroupSchema>('/api/v4/groups', {
      method: 'POST',
      body: {
        name,
        path,
        parent_id: args.parentId,
        visibility: args.visibility,
        project_creation_level: args.projectCreationLevel,
        subgroup_creation_level: args.subgroupCreationLevel,
        default_branch_protection: args.defaultBranchProtection,
        description: args.description,
      },
    })
    return data
  }

  async groupsEdit(groupId: number, args: { name?: string, path?: string }) {
    const { data } = await this.requestJson<GroupSchema>(`/api/v4/groups/${groupId}`, {
      method: 'PUT',
      body: args,
    })
    return data
  }

  async groupsRemove(groupId: number, args: { permanentlyRemove?: boolean, fullPath?: string } = {}): Promise<void> {
    await this.requestRaw(`/api/v4/groups/${groupId}`, {
      method: 'DELETE',
      query: {
        permanently_remove: args.permanentlyRemove ? true : undefined,
        full_path: args.fullPath,
      },
    })
  }

  async groupCustomAttributesSet(groupId: number, key: string, value: string): Promise<void> {
    await this.requestRaw(`/api/v4/groups/${groupId}/custom_attributes/${encodePathSegment(key)}`, {
      method: 'PUT',
      body: { value },
    })
  }

  async projectCustomAttributesSet(projectId: number, key: string, value: string): Promise<void> {
    await this.requestRaw(`/api/v4/projects/${projectId}/custom_attributes/${encodePathSegment(key)}`, {
      method: 'PUT',
      body: { value },
    })
  }

  async projectCustomAttributesDelete(projectId: number, key: string): Promise<void> {
    await this.requestRaw(`/api/v4/projects/${projectId}/custom_attributes/${encodePathSegment(key)}`, {
      method: 'DELETE',
    })
  }

  async userCustomAttributesSet(userId: number, key: string, value: string): Promise<void> {
    await this.requestRaw(`/api/v4/users/${userId}/custom_attributes/${encodePathSegment(key)}`, {
      method: 'PUT',
      body: { value },
    })
  }

  async projectsAll(query: GitlabRequestOptions['query'] = {}, page?: number, perPage?: number): Promise<GitlabListResponse<ProjectSchema>> {
    const { data, headers } = await this.requestJson<ProjectSchema[]>('/api/v4/projects', {
      query: { ...query, page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async projectsCreate(args: { name: string, path: string, namespaceId: number, description?: string, ciConfigPath?: string }): Promise<ProjectSchema> {
    const { data } = await this.requestJson<ProjectSchema>('/api/v4/projects', {
      method: 'POST',
      body: {
        name: args.name,
        path: args.path,
        namespace_id: args.namespaceId,
        description: args.description,
        ci_config_path: args.ciConfigPath,
      },
    })
    return data
  }

  async projectsEdit(projectId: number, args: { topics?: string[] }) {
    const { data } = await this.requestJson<ProjectSchema>(`/api/v4/projects/${projectId}`, {
      method: 'PUT',
      body: {
        topics: args.topics,
      },
    })
    return data
  }

  async projectsShow(projectId: number) {
    const { data } = await this.requestJson<ProjectSchema>(`/api/v4/projects/${projectId}`)
    return data
  }

  async projectsRemove(projectId: number, args: { permanentlyRemove?: boolean, fullPath?: string } = {}): Promise<void> {
    await this.requestRaw(`/api/v4/projects/${projectId}`, {
      method: 'DELETE',
      query: {
        permanently_remove: args.permanentlyRemove ? true : undefined,
        full_path: args.fullPath,
      },
    })
  }

  async usersAll(query: GitlabRequestOptions['query'] = {}, page?: number, perPage?: number): Promise<GitlabListResponse<SimpleUserSchema>> {
    const { data, headers } = await this.requestJson<SimpleUserSchema[]>('/api/v4/users', {
      query: { ...query, page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async usersCreate(args: {
    name: string
    username: string
    email: string
    externUid?: string
    provider?: string
    admin?: boolean
    auditor?: boolean
    canCreateGroup?: boolean
    canCreateProject?: boolean
    forceRandomPassword?: boolean
    password?: string
    projectsLimit?: number
    skipConfirmation?: boolean
  }): Promise<SimpleUserSchema> {
    const { data } = await this.requestJson<SimpleUserSchema>('/api/v4/users', {
      method: 'POST',
      body: {
        name: args.name,
        username: args.username,
        email: args.email,
        extern_uid: args.externUid,
        provider: args.provider,
        admin: args.admin,
        auditor: args.auditor,
        can_create_group: args.canCreateGroup,
        can_create_project: args.canCreateProject,
        force_random_password: args.forceRandomPassword,
        password: args.password,
        projects_limit: args.projectsLimit,
        skip_confirmation: args.skipConfirmation,
      },
    })
    return data
  }

  async usersEdit(userId: number, args: {
    name?: string
    username?: string
    email?: string
    externUid?: string
    provider?: string
    admin?: boolean
    auditor?: boolean
    canCreateGroup?: boolean
    canCreateProject?: boolean
  }) {
    await this.requestRaw(`/api/v4/users/${userId}`, {
      method: 'PUT',
      body: {
        name: args.name,
        username: args.username,
        email: args.email,
        extern_uid: args.externUid,
        provider: args.provider,
        admin: args.admin,
        auditor: args.auditor,
        can_create_group: args.canCreateGroup,
        can_create_project: args.canCreateProject,
      },
    })
  }

  async usersRemove(userId: number, args: { hardDelete?: boolean } = {}) {
    await this.requestRaw(`/api/v4/users/${userId}`, {
      method: 'DELETE',
      query: { hard_delete: args.hardDelete ? true : undefined },
    })
  }

  async groupMembersAll(groupId: number, page?: number, perPage?: number): Promise<GitlabListResponse<MemberSchema>> {
    const { data, headers } = await this.requestJson<MemberSchema[]>(`/api/v4/groups/${groupId}/members/all`, {
      query: { page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async groupMembersAdd(groupId: number, userId: number, accessLevel: number) {
    const { data } = await this.requestJson<MemberSchema>(`/api/v4/groups/${groupId}/members`, {
      method: 'POST',
      body: { user_id: userId, access_level: accessLevel },
    })
    return data
  }

  async groupMembersEdit(groupId: number, userId: number, accessLevel: number) {
    const { data } = await this.requestJson<MemberSchema>(`/api/v4/groups/${groupId}/members/${userId}`, {
      method: 'PUT',
      body: { access_level: accessLevel },
    })
    return data
  }

  async groupMembersRemove(groupId: number, userId: number) {
    await this.requestRaw(`/api/v4/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    })
  }

  async groupAccessTokensAll(groupId: number, page?: number, perPage?: number): Promise<GitlabListResponse<GroupAccessTokenSchema>> {
    const { data, headers } = await this.requestJson<GroupAccessTokenSchema[]>(`/api/v4/groups/${groupId}/access_tokens`, {
      query: { page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async groupAccessTokensCreate(groupId: number, name: string, scopes: string[], expiresAt: string) {
    const { data } = await this.requestJson<GroupAccessTokenCreateResponse>(`/api/v4/groups/${groupId}/access_tokens`, {
      method: 'POST',
      body: { name, scopes, expires_at: expiresAt },
    })
    return data
  }

  async groupAccessTokensRevoke(groupId: number, tokenId: number) {
    await this.requestRaw(`/api/v4/groups/${groupId}/access_tokens/${tokenId}`, {
      method: 'DELETE',
    })
  }

  async groupVariablesAll(groupId: number, page?: number, perPage?: number): Promise<GitlabListResponse<VariableSchema>> {
    const { data, headers } = await this.requestJson<VariableSchema[]>(`/api/v4/groups/${groupId}/variables`, {
      query: { page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async groupVariablesCreate(groupId: number, key: string, value: string, options: { variableType?: string, masked?: boolean, protected?: boolean } = {}) {
    await this.requestRaw(`/api/v4/groups/${groupId}/variables`, {
      method: 'POST',
      body: {
        key,
        value,
        variable_type: options.variableType,
        masked: options.masked,
        protected: options.protected,
      },
    })
  }

  async groupVariablesEdit(groupId: number, key: string, value: string, options: { variableType?: string, masked?: boolean, protected?: boolean, filter?: { environment_scope: string } } = {}) {
    await this.requestRaw(`/api/v4/groups/${groupId}/variables/${encodePathSegment(key)}`, {
      method: 'PUT',
      body: {
        value,
        variable_type: options.variableType,
        masked: options.masked,
        protected: options.protected,
        filter: options.filter,
      },
    })
  }

  async projectVariablesAll(projectId: number, page?: number, perPage?: number): Promise<GitlabListResponse<VariableSchema>> {
    const { data, headers } = await this.requestJson<VariableSchema[]>(`/api/v4/projects/${projectId}/variables`, {
      query: { page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async projectVariablesCreate(projectId: number, key: string, value: string, options: { variableType?: string, masked?: boolean, protected?: boolean, environmentScope?: string } = {}) {
    await this.requestRaw(`/api/v4/projects/${projectId}/variables`, {
      method: 'POST',
      body: {
        key,
        value,
        variable_type: options.variableType,
        masked: options.masked,
        protected: options.protected,
        environment_scope: options.environmentScope,
      },
    })
  }

  async projectVariablesEdit(projectId: number, key: string, value: string, options: { variableType?: string, masked?: boolean, protected?: boolean, filter?: { environment_scope: string } } = {}) {
    await this.requestRaw(`/api/v4/projects/${projectId}/variables/${encodePathSegment(key)}`, {
      method: 'PUT',
      body: {
        value,
        variable_type: options.variableType,
        masked: options.masked,
        protected: options.protected,
        filter: options.filter,
      },
    })
  }

  async branchesAll(projectId: number, page?: number, perPage?: number): Promise<GitlabListResponse<BranchSchema>> {
    const { data, headers } = await this.requestJson<BranchSchema[]>(`/api/v4/projects/${projectId}/repository/branches`, {
      query: { page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async repositoryFilesShow(projectId: number, filePath: string, ref: string): Promise<RepositoryFileExpandedSchema> {
    const { data } = await this.requestJson<RepositoryFileExpandedSchema>(
      `/api/v4/projects/${projectId}/repository/files/${encodePathSegment(filePath)}`,
      { query: { ref } },
    )
    return data
  }

  async repositoriesAllRepositoryTrees(projectId: number, query: { path?: string, ref?: string, recursive?: boolean } = {}, page?: number, perPage?: number): Promise<GitlabListResponse<any>> {
    const { data, headers } = await this.requestJson<any[]>(`/api/v4/projects/${projectId}/repository/tree`, {
      query: { ...query, page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async commitsCreate(projectId: number, branch: string, commitMessage: string, actions: CommitAction[]) {
    await this.requestRaw(`/api/v4/projects/${projectId}/repository/commits`, {
      method: 'POST',
      body: {
        branch,
        commit_message: commitMessage,
        actions,
      },
    })
  }

  async pipelineTriggerTokensAll(projectId: number, page?: number, perPage?: number): Promise<GitlabListResponse<PipelineTriggerTokenSchema>> {
    const { data, headers } = await this.requestJson<PipelineTriggerTokenSchema[]>(`/api/v4/projects/${projectId}/triggers`, {
      query: { page, per_page: perPage, pagination: 'offset' },
    })
    return { data, paginationInfo: parseOffsetPagination(headers) }
  }

  async pipelineTriggerTokensCreate(projectId: number, description: string): Promise<PipelineTriggerTokenSchema> {
    const { data } = await this.requestJson<PipelineTriggerTokenSchema>(`/api/v4/projects/${projectId}/triggers`, {
      method: 'POST',
      body: { description },
    })
    return data
  }

  async pipelineTriggerTokensRemove(projectId: number, triggerId: number) {
    await this.requestRaw(`/api/v4/projects/${projectId}/triggers/${triggerId}`, {
      method: 'DELETE',
    })
  }

  async pipelinesCreate(projectId: number, ref: string, variables: { key: string, value: string }[]): Promise<PipelineSchema> {
    const { data } = await this.requestJson<PipelineSchema>(`/api/v4/projects/${projectId}/pipeline`, {
      method: 'POST',
      body: {
        ref,
        variables,
      },
    })
    return data
  }

  async validateTokenForGroup(groupId: number, token: string) {
    await this.requestRaw(`/api/v4/groups/${groupId}`, { tokenOverride: token })
  }
}
