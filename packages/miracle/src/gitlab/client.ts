import type { AccessTokenScopes, CommitAction as GitbeakerCommitAction, Gitlab as GitbeakerGitlab } from '@gitbeaker/core'
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
import { Gitlab } from '@gitbeaker/rest'
import { encodePathSegment } from './http.js'
import { parseOffsetPagination } from './pagination.js'

const trailingSlashRegexp = /\/$/

export interface GitlabClientConfig {
  host: string
  token: string
}

type GitlabQuery = Record<string, string | number | boolean | undefined>

export class GitlabClient {
  public readonly host: string
  private readonly token: string
  private readonly api: GitbeakerGitlab<false>

  constructor(config: GitlabClientConfig) {
    this.host = config.host.replace(trailingSlashRegexp, '')
    this.token = config.token
    this.api = new Gitlab({ host: this.host, token: this.token, camelize: false }) as unknown as GitbeakerGitlab<false>
  }

  async groupsAll(query: GitlabQuery = {}, page?: number, perPage?: number): Promise<GitlabListResponse<GroupSchema>> {
    const res = await this.api.Groups.all({
      ...query,
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async groupsShow(groupId: number | string) {
    return this.api.Groups.show(groupId)
  }

  async groupsAllSubgroups(groupId: number, query: GitlabQuery = {}, page?: number, perPage?: number): Promise<GitlabListResponse<GroupSchema>> {
    const res = await this.api.Groups.allSubgroups(groupId, {
      ...query,
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async groupsAllProjects(groupId: number, query: GitlabQuery = {}, page?: number, perPage?: number): Promise<GitlabListResponse<CondensedProjectSchema>> {
    const res = await this.api.Groups.allProjects(groupId, {
      ...query,
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
      simple: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async groupsCreate(name: string, path: string, args: { parentId?: number, visibility?: Visibility, projectCreationLevel?: 'noone' | 'maintainer' | 'developer', subgroupCreationLevel?: string, defaultBranchProtection?: 0 | 1 | 2 | 3, description?: string } = {}): Promise<GroupSchema> {
    return this.api.Groups.create(name, path, {
      parentId: args.parentId,
      visibility: args.visibility,
      projectCreationLevel: args.projectCreationLevel,
      subgroupCreationLevel: args.subgroupCreationLevel,
      defaultBranchProtection: args.defaultBranchProtection,
      description: args.description,
    })
  }

  async groupsEdit(groupId: number, args: { name?: string, path?: string }) {
    return this.api.Groups.edit(groupId, {
      name: args.name,
      path: args.path,
    })
  }

  async groupsRemove(groupId: number, args: { permanentlyRemove?: boolean, fullPath?: string } = {}): Promise<void> {
    await this.api.Groups.remove(groupId, {
      permanentlyRemove: args.permanentlyRemove,
      fullPath: args.fullPath,
    })
  }

  async groupCustomAttributesSet(groupId: number, key: string, value: string): Promise<void> {
    await this.api.GroupCustomAttributes.set(groupId, key, value)
  }

  async projectCustomAttributesSet(projectId: number, key: string, value: string): Promise<void> {
    await this.api.ProjectCustomAttributes.set(projectId, key, value)
  }

  async projectCustomAttributesDelete(projectId: number, key: string): Promise<void> {
    await this.api.ProjectCustomAttributes.remove(projectId, key)
  }

  async userCustomAttributesSet(userId: number, key: string, value: string): Promise<void> {
    await this.api.UserCustomAttributes.set(userId, key, value)
  }

  async projectsAll(query: GitlabQuery = {}, page?: number, perPage?: number): Promise<GitlabListResponse<ProjectSchema>> {
    const res = await this.api.Projects.all({
      ...query,
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async projectsCreate(args: { name: string, path: string, namespaceId: number, description?: string, ciConfigPath?: string }): Promise<ProjectSchema> {
    return this.api.Projects.create({
      name: args.name,
      path: args.path,
      namespaceId: args.namespaceId,
      description: args.description,
      ciConfigPath: args.ciConfigPath,
    })
  }

  async projectsEdit(projectId: number, args: { topics?: string[] }) {
    return this.api.Projects.edit(projectId, { topics: args.topics })
  }

  async projectsShow(projectId: number) {
    return this.api.Projects.show(projectId)
  }

  async projectsRemove(projectId: number, args: { permanentlyRemove?: boolean, fullPath?: string } = {}): Promise<void> {
    await this.api.Projects.remove(projectId, {
      permanentlyRemove: args.permanentlyRemove,
      fullPath: args.fullPath,
    })
  }

  async usersAll(query: GitlabQuery = {}, page?: number, perPage?: number): Promise<GitlabListResponse<SimpleUserSchema>> {
    const res = await this.api.Users.all({
      ...query,
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
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
    forceRandomPassword?: boolean
    password?: string
    projectsLimit?: number
    skipConfirmation?: boolean
  }): Promise<SimpleUserSchema> {
    return this.api.Users.create({
      name: args.name,
      username: args.username,
      email: args.email,
      externUid: args.externUid,
      provider: args.provider,
      admin: args.admin,
      auditor: args.auditor,
      canCreateGroup: args.canCreateGroup,
      forceRandomPassword: args.forceRandomPassword,
      password: args.password,
      projectsLimit: args.projectsLimit,
      skipConfirmation: args.skipConfirmation,
    })
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
  }) {
    await this.api.Users.edit(userId, {
      name: args.name,
      username: args.username,
      email: args.email,
      externUid: args.externUid,
      provider: args.provider,
      admin: args.admin,
      auditor: args.auditor,
      canCreateGroup: args.canCreateGroup,
    })
  }

  async usersRemove(userId: number, args: { hardDelete?: boolean } = {}) {
    await this.api.Users.remove(userId, { hardDelete: args.hardDelete })
  }

  async groupMembersAll(groupId: number, page?: number, perPage?: number): Promise<GitlabListResponse<MemberSchema>> {
    const res = await this.api.GroupMembers.all(groupId, {
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async groupMembersAdd(groupId: number, userId: number, accessLevel: number) {
    return this.api.GroupMembers.add(groupId, userId, accessLevel)
  }

  async groupMembersEdit(groupId: number, userId: number, accessLevel: number) {
    return this.api.GroupMembers.edit(groupId, userId, accessLevel)
  }

  async groupMembersRemove(groupId: number, userId: number) {
    await this.api.GroupMembers.remove(groupId, userId)
  }

  async groupAccessTokensAll(groupId: number, page?: number, perPage?: number): Promise<GitlabListResponse<GroupAccessTokenSchema>> {
    const res = await this.api.GroupAccessTokens.all(groupId, {
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async groupAccessTokensCreate(groupId: number, name: string, scopes: string[], expiresAt: string) {
    const res = await this.api.GroupAccessTokens.create(groupId, name, scopes as unknown as AccessTokenScopes[], expiresAt)
    return res as unknown as GroupAccessTokenCreateResponse
  }

  async groupAccessTokensRevoke(groupId: number, tokenId: number) {
    await this.api.GroupAccessTokens.revoke(groupId, tokenId)
  }

  async groupVariablesAll(groupId: number, page?: number, perPage?: number): Promise<GitlabListResponse<VariableSchema>> {
    const res = await this.api.GroupVariables.all(groupId, {
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async groupVariablesCreate(groupId: number, key: string, value: string, options: { variableType?: VariableSchema['variable_type'], masked?: boolean, protected?: boolean } = {}) {
    await this.api.GroupVariables.create(groupId, key, value, {
      variableType: options.variableType,
      masked: options.masked,
      protected: options.protected,
    })
  }

  async groupVariablesEdit(groupId: number, key: string, value: string, options: { variableType?: VariableSchema['variable_type'], masked?: boolean, protected?: boolean, filter?: { environment_scope: string } } = {}) {
    await this.api.GroupVariables.edit(groupId, key, value, {
      variableType: options.variableType,
      masked: options.masked,
      protected: options.protected,
      filter: options.filter ?? { environment_scope: '*' },
    })
  }

  async projectVariablesAll(projectId: number, page?: number, perPage?: number): Promise<GitlabListResponse<VariableSchema>> {
    const res = await this.api.ProjectVariables.all(projectId, {
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async projectVariablesCreate(projectId: number, key: string, value: string, options: { variableType?: VariableSchema['variable_type'], masked?: boolean, protected?: boolean, environmentScope?: string } = {}) {
    await this.api.ProjectVariables.create(projectId, key, value, {
      variableType: options.variableType,
      masked: options.masked,
      protected: options.protected,
      environmentScope: options.environmentScope,
    })
  }

  async projectVariablesEdit(projectId: number, key: string, value: string, options: { variableType?: VariableSchema['variable_type'], masked?: boolean, protected?: boolean, filter?: { environment_scope: string } } = {}) {
    await this.api.ProjectVariables.edit(projectId, key, value, {
      variableType: options.variableType,
      masked: options.masked,
      protected: options.protected,
      filter: options.filter ?? { environment_scope: '*' },
    })
  }

  async branchesAll(projectId: number, page?: number, perPage?: number): Promise<GitlabListResponse<BranchSchema>> {
    const res = await this.api.Branches.all(projectId, {
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async repositoryFilesShow(projectId: number, filePath: string, ref: string): Promise<RepositoryFileExpandedSchema> {
    return this.api.RepositoryFiles.show(projectId, encodePathSegment(filePath), ref)
  }

  async repositoriesAllRepositoryTrees(projectId: number, query: { path?: string, ref?: string, recursive?: boolean } = {}, page?: number, perPage?: number): Promise<GitlabListResponse<any>> {
    const url = new URL(`${this.host}/api/v4/projects/${projectId}/repository/tree`)
    url.search = new URLSearchParams({
      ...Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])),
      ...(page ? { page: String(page) } : {}),
      ...(perPage ? { per_page: String(perPage) } : {}),
    }).toString()

    const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': this.token } })
    const data = await res.json() as any[]
    return { data, paginationInfo: parseOffsetPagination(res.headers) }
  }

  async commitsCreate(projectId: number, branch: string, commitMessage: string, actions: CommitAction[]) {
    const mappedActions: GitbeakerCommitAction[] = actions.map(action => ({
      action: action.action,
      filePath: action.file_path,
      previousPath: action.previous_path,
      content: action.content,
      encoding: action.encoding,
      lastCommitId: action.last_commit_id,
      execute_filemode: action.execute_filemode,
    }))

    await this.api.Commits.create(projectId, branch, commitMessage, mappedActions)
  }

  async pipelineTriggerTokensAll(projectId: number, page?: number, perPage?: number): Promise<GitlabListResponse<PipelineTriggerTokenSchema>> {
    const res = await this.api.PipelineTriggerTokens.all(projectId, {
      page,
      perPage,
      pagination: 'offset',
      showExpanded: true,
    })
    return { data: res.data, paginationInfo: { next: res.paginationInfo.next } }
  }

  async pipelineTriggerTokensCreate(projectId: number, description: string): Promise<PipelineTriggerTokenSchema> {
    return this.api.PipelineTriggerTokens.create(projectId, description)
  }

  async pipelineTriggerTokensRemove(projectId: number, triggerId: number) {
    await this.api.PipelineTriggerTokens.remove(projectId, triggerId)
  }

  async pipelinesCreate(projectId: number, ref: string, variables: { key: string, value: string }[]): Promise<PipelineSchema> {
    return this.api.Pipelines.create(projectId, ref, { variables })
  }

  async validateTokenForGroup(groupId: number, token: string) {
    const api = new Gitlab({ host: this.host, token, camelize: false }) as unknown as GitbeakerGitlab<false>
    await api.Groups.show(groupId)
  }
}
