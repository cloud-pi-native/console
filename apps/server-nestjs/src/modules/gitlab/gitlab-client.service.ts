import type {
  AccessLevel,
  AccessTokenScopes,
  BaseRequestOptions,
  CommitAction,
  CondensedGroupSchema,
  CondensedProjectSchema,
  EditUserOptions,
  ExpandedUserSchema,
  Gitlab,
  GroupSchema,
  OffsetPagination,
  PaginationRequestOptions,
  PipelineTriggerTokenSchema,
  SimpleUserSchema,
  VariableType,
} from '@gitbeaker/core'
import type { ConfigType } from '@nestjs/config'
import { join } from 'node:path'
import { defaultBranchName } from '@cpn-console/shared'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { Gitlab as GitlabRest } from '@gitbeaker/rest'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { find } from '../../utils/iterable.utils'
import {
  GROUP_ROOT_CUSTOM_ATTRIBUTE_KEY,
  INFRA_GROUP_CUSTOM_ATTRIBUTE_KEY,
  INFRA_GROUP_PATH,
  MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY,
  MIRROR_REPO_NAME,
  PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY,
  SPECIAL_REPO_NAMES,
  TOKEN_DESCRIPTION,
  TOPIC_PLUGIN_MANAGED,
  TOPIC_SYSTEM_MANAGED,
  USER_ID_CUSTOM_ATTRIBUTE_KEY,
} from './gitlab.constants'
import { generateGitlabCIConfigContent, generateMirrorScriptContent, hasFileContentChanged, hasGitbeakerCause, isGitbeakerNotFound } from './gitlab.utils'

export const GITLAB_REST_CLIENT = Symbol('GITLAB_REST_CLIENT')

type With<T, K extends keyof T> = T & Required<Pick<T, K>>
export type CondensedGroupSchemaWith<T extends keyof CondensedGroupSchema> = With<CondensedGroupSchema, T>
export type CondensedProjectSchemaWith<T extends keyof CondensedProjectSchema> = With<CondensedProjectSchema, T>

export interface UpsertProjectGroupRepoOptions {
  description?: string
  ciConfigPath?: string
  extraTopics?: string[]
}
export type EditUserOptionsWith<T extends keyof EditUserOptions> = With<EditUserOptions, T>
type UserSchema = SimpleUserSchema | ExpandedUserSchema

export interface OffsetPaginateOptions {
  startPage?: number
  perPage?: number
  maxPages?: number
}

@Injectable()
export class GitlabClientService {
  private readonly logger = new Logger(GitlabClientService.name)

  constructor(
    @Inject(gitlabConfigFactory.KEY) readonly config: ConfigType<typeof gitlabConfigFactory>,
    @Inject(GITLAB_REST_CLIENT) private readonly client: Gitlab,
  ) {
  }

  async upsertGroupCustomAttribute(groupId: number, key: string, value: string): Promise<void> {
    this.logger.verbose(`Upserting a GitLab group custom attribute (groupId=${groupId}, key=${key})`)
    try {
      await this.client.GroupCustomAttributes.set(groupId, key, value)
    } catch (error) {
      this.logger.debug(`Failed to upsert a GitLab group custom attribute (groupId=${groupId}, key=${key}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async upsertProjectCustomAttribute(projectId: number, key: string, value: string): Promise<void> {
    this.logger.verbose(`Upserting a GitLab project custom attribute (projectId=${projectId}, key=${key})`)
    try {
      await this.client.ProjectCustomAttributes.set(projectId, key, value)
    } catch (error) {
      this.logger.debug(`Failed to upsert a GitLab project custom attribute (projectId=${projectId}, key=${key}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async upsertUserCustomAttribute(userId: number, key: string, value: string): Promise<void> {
    this.logger.verbose(`Upserting a GitLab user custom attribute (userId=${userId}, key=${key})`)
    try {
      await this.client.UserCustomAttributes.set(userId, key, value)
    } catch (error) {
      this.logger.debug(`Failed to upsert a GitLab user custom attribute (userId=${userId}, key=${key}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async setManagedUserAttributes(userId: number, cpnUserId: string) {
    await this.upsertUserCustomAttribute(userId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
    await this.upsertUserCustomAttribute(userId, USER_ID_CUSTOM_ATTRIBUTE_KEY, cpnUserId)
  }

  private async setManagedInfraProjectAttributes(projectId: number) {
    await this.upsertProjectCustomAttribute(projectId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
  }

  private async setManagedProjectAttributes(projectId: number, projectSlug: string) {
    await this.upsertProjectCustomAttribute(projectId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
    await this.upsertProjectCustomAttribute(projectId, PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY, projectSlug)
  }

  private async setManagedGroupAttributes(groupId: number) {
    await this.upsertGroupCustomAttribute(groupId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
  }

  private async setManagedRootGroupAttributes(groupId: number) {
    await this.setManagedGroupAttributes(groupId)
    await this.upsertGroupCustomAttribute(groupId, GROUP_ROOT_CUSTOM_ATTRIBUTE_KEY, 'true')
  }

  private async setManagedInfraGroupAttributes(groupId: number) {
    await this.setManagedGroupAttributes(groupId)
    await this.upsertGroupCustomAttribute(groupId, INFRA_GROUP_CUSTOM_ATTRIBUTE_KEY, 'true')
  }

  private async setManagedProjectGroupAttributes(groupId: number, projectSlug: string) {
    await this.setManagedGroupAttributes(groupId)
    await this.upsertGroupCustomAttribute(groupId, PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY, projectSlug)
  }

  async getGroupByPath(path: string) {
    this.logger.verbose(`Looking up a GitLab group by path ${path}`)
    return find(
      this.offsetPaginate(opts => this.client.Groups.all({ search: path, orderBy: 'path', ...opts })),
      g => g.full_path === path,
    )
  }

  async createGroup(path: string) {
    this.logger.log(`Creating a GitLab group at path ${path}`)
    try {
      const created = await this.client.Groups.create(path, path)
      if (created.full_path === this.config.projectRootDir) {
        await this.setManagedRootGroupAttributes(created.id)
      }
      if (created.full_path === `${this.config.projectRootDir}/${INFRA_GROUP_PATH}`) {
        await this.setManagedInfraGroupAttributes(created.id)
      }
      return created
    } catch (error) {
      if (hasGitbeakerCause(error, 'has already been taken')) {
        this.logger.warn(`GitLab group already exists (race); reloading ${path}`)
        const existing = await this.getGroupByPath(path)
        if (existing) return existing
      }
      throw error
    }
  }

  async createSubGroup(parentGroup: CondensedGroupSchemaWith<'id' | 'full_path'>, name: string, fullPath: string) {
    this.logger.log(`Creating a GitLab subgroup ${fullPath} (parentId=${parentGroup.id})`)
    try {
      const created = await this.client.Groups.create(name, name, { parentId: parentGroup.id })
      if (fullPath === this.config.projectRootDir) {
        await this.setManagedRootGroupAttributes(created.id)
      } else if (fullPath === `${this.config.projectRootDir}/${INFRA_GROUP_PATH}`) {
        await this.setManagedInfraGroupAttributes(created.id)
      } else if (fullPath.startsWith(`${this.config.projectRootDir}/`) && !fullPath.slice(this.config.projectRootDir.length + 1).includes('/')) {
        await this.setManagedProjectGroupAttributes(created.id, fullPath.slice(this.config.projectRootDir.length + 1))
      }
      return created
    } catch (error) {
      if (hasGitbeakerCause(error, 'has already been taken')) {
        this.logger.warn(`GitLab subgroup already exists (race); reloading ${fullPath}`)
        const existing = await this.getGroupByPath(fullPath)
        if (existing) return existing
      }
      throw error
    }
  }

  async getOrCreateGroupByPath(path: string) {
    const parts = path.split('/')
    const rootGroupPath = parts.shift()
    if (!rootGroupPath) throw new Error('Invalid projects root dir')

    this.logger.verbose(`Resolving GitLab group path ${path} (depth=${1 + parts.length})`)
    let parentGroup = await this.getGroupByPath(rootGroupPath) ?? await this.createGroup(rootGroupPath)
    if (this.config.projectRootDir && parentGroup.full_path === this.config.projectRootDir) {
      await this.setManagedRootGroupAttributes(parentGroup.id)
    }

    let currentFullPath: string
    for (const part of parts) {
      currentFullPath = `${parentGroup.full_path}/${part}`
      parentGroup = await this.getGroupByPath(currentFullPath) ?? await this.createSubGroup(parentGroup, part, currentFullPath)
    }

    this.logger.verbose(`GitLab group path resolved (path=${path}, groupId=${parentGroup.id})`)
    return parentGroup
  }

  async getOrCreateProjectGroup() {
    if (!this.config.projectRootDir) throw new Error('projectRootDir not configured')
    return this.getOrCreateGroupByPath(this.config.projectRootDir)
  }

  async getOrCreateProjectSubGroup(subGroupPath: string) {
    const fullPath = this.config.projectRootDir
      ? `${this.config.projectRootDir}/${subGroupPath}`
      : subGroupPath
    return this.getOrCreateGroupByPath(fullPath)
  }

  async getOrCreateProjectGroupPublicUrl(): Promise<string> {
    const projectGroup = await this.getOrCreateProjectGroup()
    return new URL(projectGroup.full_path, this.config.url).toString()
  }

  async getOrCreateInfraGroupRepoPublicUrl(repoName: string): Promise<string> {
    const projectGroup = await this.getOrCreateProjectGroup()
    return new URL(`${projectGroup.full_path}/${INFRA_GROUP_PATH}/${repoName}.git`, this.config.url).toString()
  }

  async getOrCreateProjectGroupInternalRepoUrl(subGroupPath: string, repoName: string): Promise<string> {
    const projectGroup = await this.getOrCreateProjectSubGroup(subGroupPath)
    const urlBase = this.config.internalUrl ?? this.config.url
    if (!urlBase) throw new Error('GITLAB_URL is required')
    return `${urlBase}/${projectGroup.full_path}/${repoName}.git`
  }

  private async getOrCreateRepo(subGroupPath: string, ciConfigPath?: string) {
    const fullPath = this.config.projectRootDir
      ? `${this.config.projectRootDir}/${subGroupPath}`
      : subGroupPath
    this.logger.verbose(`Resolving a GitLab project repository by path ${fullPath}`)
    try {
      const existingRepo = await this.client.Projects.show(fullPath)
      if (existingRepo) {
        this.logger.verbose(`Found a GitLab project repository (path=${fullPath}, repoId=${existingRepo.id})`)
        return existingRepo
      }
    } catch (error) {
      if (!isGitbeakerNotFound(error)) {
        throw error
      }
    }
    const repo = await find(
      this.offsetPaginate(opts => this.client.Projects.all({
        search: fullPath,
        orderBy: 'path',
        ...opts,
      })),
      p => p.path_with_namespace === fullPath,
    )
    if (repo) {
      this.logger.verbose(`Found a GitLab project repository via search (path=${fullPath}, repoId=${repo.id})`)
      return repo
    }
    const parts = subGroupPath.split('/')
    const repoName = parts.pop()
    if (!repoName) throw new Error('Invalid repo path')
    const parentGroup = await this.getOrCreateProjectSubGroup(parts.join('/'))
    try {
      const created = await this.client.Projects.create({
        name: repoName,
        path: repoName,
        namespaceId: parentGroup.id,
        defaultBranch: defaultBranchName,
        ciConfigPath,
      })
      this.logger.log(`Created a GitLab project repository (path=${fullPath}, repoId=${created.id})`)
      return created
    } catch (error) {
      if (hasGitbeakerCause(error, 'has already been taken')) {
        this.logger.warn(`GitLab project repository already exists (race); reloading ${fullPath}`)
        const reloaded = await this.client.Projects.show(fullPath)
        return reloaded
      }
      throw error
    }
  }

  async getOrCreateProjectGroupRepo(projectSlug: string, subGroupPath: string, ciConfigPath?: string) {
    const repo = await this.getOrCreateRepo(subGroupPath, ciConfigPath)
    await this.setManagedProjectAttributes(repo.id, projectSlug)
    return repo
  }

  async getOrCreateInfraGroupRepo(path: string) {
    const fullPath = join(INFRA_GROUP_PATH, path)
    const repo = await this.getOrCreateRepo(fullPath)
    await this.setManagedInfraProjectAttributes(repo.id)
    return repo
  }

  async createGroupRepo(groupId: number, repoName: string, description?: string) {
    this.logger.log(`Creating a GitLab repository in a standalone group (groupId=${groupId}, repoName=${repoName})`)
    const created = await this.client.Projects.create({
      name: repoName,
      path: repoName,
      namespaceId: groupId,
      description,
      defaultBranch: defaultBranchName,
    })
    return created
  }

  async getFile(repo: CondensedProjectSchemaWith<'id'>, filePath: string, ref: string = 'main') {
    try {
      return await this.client.RepositoryFiles.show(repo.id, filePath, ref)
    } catch (error) {
      if (hasGitbeakerCause(error, 'Not Found')) {
        this.logger.debug(`GitLab file not found (repoId=${repo.id}, ref=${ref}, filePath=${filePath})`)
        return
      }
      throw error
    }
  }

  async maybeCreateCommit(
    repo: CondensedProjectSchemaWith<'id'>,
    message: string,
    actions: CommitAction[],
    ref: string = 'main',
  ): Promise<void> {
    if (actions.length === 0) {
      this.logger.debug(`No GitLab commit actions to create (repoId=${repo.id}, ref=${ref})`)
      return
    }
    this.logger.log(`Creating a GitLab commit (repoId=${repo.id}, ref=${ref}, actions=${actions.length})`)
    await this.client.Commits.create(repo.id, ref, message, actions)
    this.logger.verbose(`GitLab commit created (repoId=${repo.id}, ref=${ref}, actions=${actions.length})`)
  }

  async generateCreateOrUpdateAction(repo: CondensedProjectSchemaWith<'id'>, ref: string, filePath: string, content: string): Promise<CommitAction | null> {
    const file = await this.getFile(repo, filePath, ref)
    if (file && !hasFileContentChanged(file, content)) {
      this.logger.debug(`GitLab file is up to date; skipping commit action (repoId=${repo.id}, ref=${ref}, filePath=${filePath})`)
      return null
    }
    this.logger.verbose(`Prepared a GitLab commit action (repoId=${repo.id}, ref=${ref}, filePath=${filePath}, action=${file ? 'update' : 'create'})`)
    return {
      action: file ? 'update' : 'create',
      filePath,
      content,
    }
  }

  async listFiles(repo: CondensedProjectSchemaWith<'id'>, options: { path?: string, recursive?: boolean, ref?: string } = {}) {
    try {
      const path = options.path ?? '/'
      const recursive = options.recursive ?? false
      const ref = options.ref ?? 'main'
      this.logger.verbose(`Listing GitLab repository tree (repoId=${repo.id}, ref=${ref}, path=${path}, recursive=${recursive})`)
      const files = await this.client.Repositories.allRepositoryTrees(repo.id, {
        path: options.path ?? '/',
        recursive: options.recursive ?? false,
        ref: options.ref ?? 'main',
      })
      this.logger.verbose(`Listed GitLab repository tree (repoId=${repo.id}, ref=${ref}, path=${path}, count=${files.length})`)
      return files
    } catch (error) {
      if (hasGitbeakerCause(error, 'Not Found') || hasGitbeakerCause(error, '404 Tree Not Found')) {
        return []
      }
      throw error
    }
  }

  async getProjectGroup(projectSlug: string): Promise<GroupSchema | undefined> {
    const parentGroup = await this.getOrCreateProjectGroup()
    return await find(
      this.offsetPaginate(opts => this.client.Groups.allSubgroups(parentGroup.id, opts)),
      g => g.name === projectSlug,
    )
  }

  async deleteGroup(group: CondensedGroupSchemaWith<'id' | 'full_path'>): Promise<void> {
    this.logger.verbose(`Deleting GitLab group ${group.full_path} (groupId=${group.id})`)
    await this.client.Groups.remove(group.id)
  }

  async getGroupMembers(group: CondensedGroupSchemaWith<'id'>) {
    this.logger.verbose(`Loading GitLab group members (groupId=${group.id})`)
    return this.client.GroupMembers.all(group.id)
  }

  async addGroupMember(group: CondensedGroupSchemaWith<'id'>, userId: number, accessLevel: Exclude<AccessLevel, AccessLevel.ADMIN>) {
    this.logger.verbose(`Adding a GitLab group member (groupId=${group.id}, userId=${userId}, accessLevel=${accessLevel})`)
    return this.client.GroupMembers.add(group.id, userId, accessLevel)
  }

  async editGroupMember(group: CondensedGroupSchemaWith<'id'>, userId: number, accessLevel: Exclude<AccessLevel, AccessLevel.ADMIN>) {
    this.logger.verbose(`Editing a GitLab group member (groupId=${group.id}, userId=${userId}, accessLevel=${accessLevel})`)
    return this.client.GroupMembers.edit(group.id, userId, accessLevel)
  }

  async removeGroupMember(group: CondensedGroupSchemaWith<'id'>, userId: number) {
    this.logger.verbose(`Removing a GitLab group member (groupId=${group.id}, userId=${userId})`)
    return this.client.GroupMembers.remove(group.id, userId)
  }

  async getUserByEmail(email: string) {
    const users = await this.client.Users.all({ search: email, orderBy: 'username' })
    if (users.length === 0) return null
    return users[0] as UserSchema
  }

  async createUser(user: EditUserOptions) {
    this.logger.log(`Creating a GitLab user (email=${user.email}, username=${user.username})`)
    try {
      return await this.client.Users.create({
        ...user,
        canCreateGroup: false,
        forceRandomPassword: true,
        projectsLimit: 0,
        skipConfirmation: true,
      }) as UserSchema
    } catch (error) {
      // GitLab auto-provisions users via OIDC, so a 409 means the user already
      // exists (email index race in getUserByEmail). Return it instead of failing.
      if (hasGitbeakerCause(error, 'has already been taken')) {
        const existing = user.email ? await this.getUserByEmail(user.email) : null
        if (existing) return existing as UserSchema
        throw error
      }
      throw error
    }
  }

  async upsertUser(
    user: Omit<EditUserOptionsWith<'email' | 'username' | 'name'>, 'externUid' | 'provider'>,
    options: { cpnUserId: string },
  ) {
    const existing = await this.getUserByEmail(user.email)

    const editOptions: EditUserOptions = {
      ...user,
      externUid: user.email,
      provider: 'openid_connect',
    }
    const gitlabUser = existing ?? await this.createUser(editOptions)

    if (existing) {
      const hasDiff = Object.entries(editOptions).some(([key, value]) => {
        if (value === undefined) return false
        return (existing as Record<string, unknown>)[key] !== value
      })
      if (hasDiff) {
        await this.client.Users.edit(gitlabUser.id, editOptions)
      }
    }
    await this.setManagedUserAttributes(gitlabUser.id, options.cpnUserId)
    return gitlabUser
  }

  async* getRepos(projectSlug: string) {
    const group = await this.getOrCreateProjectSubGroup(projectSlug)
    yield* this.getGroupRepos(group.id)
  }

  async* getGroupRepos(groupId: number) {
    const repos = this.offsetPaginate(opts => this.client.Groups.allProjects(groupId, { simple: false, ...opts }))
    for await (const repo of repos) {
      yield repo
    }
  }

  async upsertProjectGroupRepo(projectSlug: string, repoName: string, options: UpsertProjectGroupRepoOptions = {}) {
    const { description, ciConfigPath, extraTopics = [] } = options
    const fullPath = `${projectSlug}/${repoName}`
    const repo = await this.getOrCreateProjectGroupRepo(projectSlug, fullPath, ciConfigPath)
    const updated = await this.client.Projects.edit(repo.id, {
      name: repoName,
      path: repoName,
      topics: [TOPIC_PLUGIN_MANAGED, ...extraTopics],
      description,
      ciConfigPath: ciConfigPath ?? '',
    })
    return updated
  }

  async deleteProjectGroupRepo(projectSlug: string, repoName: string) {
    const fullPath = `${projectSlug}/${repoName}`
    const repo = await this.getOrCreateProjectGroupRepo(projectSlug, fullPath)
    return this.client.Projects.remove(repo.id)
  }

  // CI Variables
  public async setGitlabGroupVariable(
    groupId: number,
    key: string,
    value: string,
    options: { masked: boolean, protected: boolean, variableType: VariableType },
  ): Promise<void> {
    const current = await this.client.GroupVariables.show(groupId, key).catch((error) => {
      if (isGitbeakerNotFound(error)) return undefined
      throw error
    })
    if (!current) {
      await this.client.GroupVariables.create(groupId, key, value, {
        variableType: options.variableType,
        masked: options.masked,
        protected: options.protected,
      })
      return
    }
    if (current.masked === options.masked
      && current.value === value
      && current.protected === options.protected
      && current.variable_type === options.variableType) {
      return
    }
    await this.client.GroupVariables.edit(groupId, key, value, {
      variableType: options.variableType,
      masked: options.masked,
      protected: options.protected,
      filter: { environment_scope: '*' },
    })
  }

  public async setGitlabRepoVariable(
    repoId: number,
    key: string,
    value: string,
    options: { masked: boolean, protected: boolean, variableType: VariableType, environmentScope: string },
  ): Promise<void> {
    const current = await this.client.ProjectVariables.show(repoId, key, { filter: { environment_scope: options.environmentScope } }).catch((error) => {
      if (isGitbeakerNotFound(error)) return undefined
      throw error
    })
    if (!current) {
      await this.client.ProjectVariables.create(repoId, key, value, {
        variableType: options.variableType,
        masked: options.masked,
        protected: options.protected,
        environmentScope: options.environmentScope,
      })
      return
    }
    if (current.masked === options.masked
      && current.value === value
      && current.protected === options.protected
      && current.variable_type === options.variableType) {
      return
    }
    await this.client.ProjectVariables.edit(repoId, key, value, {
      variableType: options.variableType,
      masked: options.masked,
      protected: options.protected,
      environmentScope: options.environmentScope,
      filter: { environment_scope: options.environmentScope },
    })
  }

  async readGroupVariable(groupId: number, key: string) {
    return this.client.GroupVariables.show(groupId, key).catch((error) => {
      if (isGitbeakerNotFound(error)) return undefined
      throw error
    })
  }

  async readProjectVariables(repoId: number, environmentScope: string) {
    const all = await this.client.ProjectVariables.all(repoId)
    return all.filter(variable => variable.environment_scope === environmentScope)
  }

  async commitMirror(repoId: number) {
    this.logger.log(`Creating a GitLab mirror bootstrap commit (repoId=${repoId})`)
    const actions: CommitAction[] = [
      {
        action: 'create',
        filePath: '.gitlab-ci.yml',
        content: generateGitlabCIConfigContent(),
        execute_filemode: false,
      },
      {
        action: 'create',
        filePath: 'mirror.sh',
        content: generateMirrorScriptContent(),
        execute_filemode: true,
      },
    ]

    await this.client.Commits.create(
      repoId,
      'main',
      'ci: :construction_worker: first mirror',
      actions,
    )
    this.logger.verbose(`GitLab mirror bootstrap commit created (repoId=${repoId}, actions=${actions.length})`)
  }

  async upsertProjectMirrorRepo(projectSlug: string) {
    return this.upsertProjectGroupRepo(projectSlug, MIRROR_REPO_NAME, { extraTopics: [TOPIC_SYSTEM_MANAGED] })
  }

  async getProjectToken(group: CondensedGroupSchemaWith<'id'>, projectSlug: string) {
    return find(
      this.offsetPaginate<{ name: string, id: number }>(
        opts => this.client.GroupAccessTokens.all(group.id, opts) as unknown as Promise<{ data: { name: string, id: number }[], paginationInfo: OffsetPagination }>,
      ),
      token => token.name === `${projectSlug}-bot`,
    )
  }

  async createProjectToken(group: CondensedGroupSchemaWith<'id'>, tokenName: string, scopes: AccessTokenScopes[]) {
    const expiryDate = new Date(Date.now() + this.config.mirrorTokenExpirationDays * 24 * 60 * 60 * 1000)
    this.logger.log(`Creating a GitLab group access token (groupId=${group.id}, tokenName=${tokenName}, expiry=${expiryDate.toISOString().slice(0, 10)})`)
    return this.client.GroupAccessTokens.create(group.id, tokenName, scopes, expiryDate.toISOString().slice(0, 10))
  }

  async createMirrorAccessToken(projectSlug: string) {
    const tokenName = `${projectSlug}-bot`
    const group = await this.getProjectGroup(projectSlug)
    if (!group) throw new Error(`Unable to retrieve gitlab project group for ${projectSlug}`)
    return this.createProjectToken(group, tokenName, ['write_repository', 'read_repository', 'read_api'])
  }

  async revokeProjectToken(group: CondensedGroupSchemaWith<'id'>, tokenId: number): Promise<void> {
    this.logger.log(`Revoking a GitLab group access token (groupId=${group.id}, tokenId=${tokenId})`)
    await this.client.GroupAccessTokens.revoke(group.id, tokenId)
  }

  async validateProjectToken(token: string): Promise<boolean> {
    // gitbeaker has no per-call auth override, so validation needs a client bound to the candidate token
    const client = new GitlabRest({ token, host: this.config.internalUrl ?? this.config.url })
    try {
      const self = await client.PersonalAccessTokens.show()
      return self.active && !self.revoked
    } catch (error) {
      if (error instanceof GitbeakerRequestError && error.cause?.response.status === 401) return false
      throw error
    }
  }

  /**
   * The `mirror` repo id travels with the token: it is what callers persist as
   * `GIT_MIRROR_PROJECT_ID`, and `PipelineTriggerTokenSchema` does not carry it.
   */
  async getOrCreateMirrorPipelineTriggerToken(projectSlug: string): Promise<PipelineTriggerTokenSchema & { repoId: number }> {
    const mirrorRepo = await this.upsertProjectMirrorRepo(projectSlug)
    this.logger.verbose(`Resolving a GitLab pipeline trigger token (projectSlug=${projectSlug}, repoId=${mirrorRepo.id})`)
    const currentTriggerToken = await find(
      this.offsetPaginate<PipelineTriggerTokenSchema>(opts => this.client.PipelineTriggerTokens.all(mirrorRepo.id, opts)),
      token => token.description === TOKEN_DESCRIPTION,
    )
    if (currentTriggerToken) {
      this.logger.verbose(`GitLab pipeline trigger token found (projectSlug=${projectSlug}, repoId=${mirrorRepo.id})`)
      return { ...currentTriggerToken, repoId: mirrorRepo.id }
    }
    const created = await this.client.PipelineTriggerTokens.create(mirrorRepo.id, TOKEN_DESCRIPTION)
    this.logger.log(`GitLab pipeline trigger token created (projectSlug=${projectSlug}, repoId=${mirrorRepo.id})`)
    return { ...created, repoId: mirrorRepo.id }
  }

  /**
   * Triggers the mirroring pipeline for one repository of a project.
   *
   * The mirroring is not performed against the target repo directly: the project's
   * `mirror` repo carries the pipeline, which is started with the target designated by the `PROJECT_NAME` variable.
   * `SPECIAL_REPO_NAMES` are the console's own plumbing repositories — mirroring one of
   * them would have the pipeline act on itself or on the infra repo, so it is refused.
   */
  async triggerMirror(projectSlug: string, targetRepo: string, syncAllBranches: boolean, branchName?: string) {
    if (SPECIAL_REPO_NAMES.includes(targetRepo)) {
      throw new Error('User requested for invalid mirroring')
    }
    this.logger.log(`Triggering a GitLab mirror pipeline (projectSlug=${projectSlug}, targetRepo=${targetRepo}, syncAllBranches=${syncAllBranches})`)

    let mirror: CondensedProjectSchemaWith<'id'> | undefined
    let target: CondensedProjectSchemaWith<'id'> | undefined
    for await (const repo of this.getRepos(projectSlug)) {
      if (repo.name === MIRROR_REPO_NAME) mirror = repo
      if (repo.name === targetRepo) target = repo
    }
    if (!mirror) throw new Error('Unable to find mirror repository')
    if (!target) throw new Error('Unable to find target repository')

    const pipeline = await this.client.Pipelines.create(mirror.id, 'main', {
      variables: [
        { key: 'SYNC_ALL', value: syncAllBranches.toString() },
        { key: 'GIT_BRANCH_DEPLOY', value: branchName ?? '' },
        { key: 'PROJECT_NAME', value: targetRepo },
      ],
    })
    this.logger.verbose(`GitLab mirror pipeline created (projectSlug=${projectSlug}, targetRepo=${targetRepo}, pipelineId=${pipeline.id})`)
    return pipeline
  }

  private async* offsetPaginate<T>(
    request: (options: PaginationRequestOptions<'offset'> & BaseRequestOptions<true>) => Promise<{ data: T[], paginationInfo: OffsetPagination }>,
    options?: OffsetPaginateOptions,
  ): AsyncGenerator<T> {
    let page: number | null = options?.startPage ?? 1
    let pagesFetched = 0
    let total = 0

    this.logger.debug(`Pagination start (page=${page})`)

    while (page !== null) {
      if (options?.maxPages && pagesFetched >= options.maxPages) {
        page = null
        continue
      }

      try {
        const { data, paginationInfo } = await request({
          page,
          perPage: options?.perPage,
          maxPages: options?.maxPages,
          showExpanded: true,
          pagination: 'offset',
        })

        pagesFetched += 1
        total += data.length

        const nextPage = paginationInfo.next ?? null
        this.logger.debug(`Pagination page fetched (page=${page}, nextPage=${nextPage ?? 'null'}, items=${data.length}, total=${total})`)

        for (const item of data) {
          yield item
        }

        page = nextPage
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Pagination request failed (page=${page}): ${error.message}`, error.stack)
        } else {
          this.logger.error(`Pagination request failed (page=${page}): ${String(error)}`)
        }
        throw error
      }
    }

    this.logger.debug(`Pagination done (total=${total})`)
  }
}
