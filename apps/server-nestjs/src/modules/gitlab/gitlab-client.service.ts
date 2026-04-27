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
} from '@gitbeaker/core'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { find } from '../../utils/iterable'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import {
  GROUP_ROOT_CUSTOM_ATTRIBUTE_KEY,
  INFRA_GROUP_CUSTOM_ATTRIBUTE_KEY,
  INFRA_GROUP_PATH,
  MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY,
  MIRROR_REPO_NAME,
  PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY,
  TOKEN_DESCRIPTION,
  TOPIC_PLUGIN_MANAGED,
  USER_ID_CUSTOM_ATTRIBUTE_KEY,
} from './gitlab.constants'

export const GITLAB_REST_CLIENT = Symbol('GITLAB_REST_CLIENT')

type With<T, K extends keyof T> = T & Required<Pick<T, K>>
export type CondensedGroupSchemaWith<T extends keyof CondensedGroupSchema> = With<CondensedGroupSchema, T>
export type CondensedProjectSchemaWith<T extends keyof CondensedProjectSchema> = With<CondensedProjectSchema, T>
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
    @Inject(ConfigurationService) readonly config: ConfigurationService,
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
    const created = await this.client.Groups.create(path, path)
    if (this.config.projectRootDir && created.full_path === this.config.projectRootDir) {
      await this.setManagedRootGroupAttributes(created.id)
    }
    if (this.config.projectRootDir && created.full_path === `${this.config.projectRootDir}/${INFRA_GROUP_PATH}`) {
      await this.setManagedInfraGroupAttributes(created.id)
    }
    return created
  }

  async createSubGroup(parentGroup: CondensedGroupSchemaWith<'id' | 'full_path'>, name: string, fullPath: string) {
    this.logger.log(`Creating a GitLab subgroup ${fullPath} (parentId=${parentGroup.id})`)
    const created = await this.client.Groups.create(name, name, { parentId: parentGroup.id })
    if (this.config.projectRootDir && fullPath === this.config.projectRootDir) {
      await this.setManagedRootGroupAttributes(created.id)
    } else if (this.config.projectRootDir && fullPath === `${this.config.projectRootDir}/${INFRA_GROUP_PATH}`) {
      await this.setManagedInfraGroupAttributes(created.id)
    } else if (this.config.projectRootDir && fullPath.startsWith(`${this.config.projectRootDir}/`) && !fullPath.slice(this.config.projectRootDir.length + 1).includes('/')) {
      const projectSlug = fullPath.slice(this.config.projectRootDir.length + 1)
      if (projectSlug && projectSlug !== INFRA_GROUP_PATH) {
        await this.setManagedProjectGroupAttributes(created.id, projectSlug)
      }
    }
    return created
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
    return `${this.config.gitlabUrl}/${projectGroup.full_path}`
  }

  async getOrCreateInfraGroupRepoPublicUrl(repoName: string): Promise<string> {
    const projectGroup = await this.getOrCreateProjectGroup()
    return `${this.config.gitlabUrl}/${projectGroup.full_path}/${INFRA_GROUP_PATH}/${repoName}.git`
  }

  async getOrCreateProjectGroupInternalRepoUrl(subGroupPath: string, repoName: string): Promise<string> {
    const projectGroup = await this.getOrCreateProjectSubGroup(subGroupPath)
    const urlBase = this.config.getInternalOrPublicGitlabUrl()
    if (!urlBase) throw new Error('GITLAB_URL is required')
    return `${urlBase}/${projectGroup.full_path}/${repoName}.git`
  }

  private async getOrCreateRepo(subGroupPath: string) {
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
      if (!(error instanceof GitbeakerRequestError) || !error.cause?.description?.includes('404')) {
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
        defaultBranch: 'main',
      })
      this.logger.log(`Created a GitLab project repository (path=${fullPath}, repoId=${created.id})`)
      return created
    } catch (error) {
      if (error instanceof GitbeakerRequestError && error.cause?.description?.includes('has already been taken')) {
        this.logger.warn(`GitLab project repository already exists (race); reloading ${fullPath}`)
        const reloaded = await this.client.Projects.show(fullPath)
        return reloaded
      }
      throw error
    }
  }

  async getOrCreateProjectGroupRepo(projectSlug: string, subGroupPath: string) {
    const repo = await this.getOrCreateRepo(subGroupPath)
    await this.setManagedProjectAttributes(repo.id, projectSlug)
    return repo
  }

  async getOrCreateInfraGroupRepo(path: string) {
    const fullPath = join(INFRA_GROUP_PATH, path)
    const repo = await this.getOrCreateRepo(fullPath)
    await this.setManagedInfraProjectAttributes(repo.id)
    return repo
  }

  async getFile(repo: CondensedProjectSchemaWith<'id'>, filePath: string, ref: string = 'main') {
    try {
      return await this.client.RepositoryFiles.show(repo.id, filePath, ref)
    } catch (error) {
      if (error instanceof GitbeakerRequestError && error.cause?.description?.includes('Not Found')) {
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

  async generateCreateOrUpdateAction(repo: CondensedProjectSchemaWith<'id'>, ref: string, filePath: string, content: string) {
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
    } satisfies CommitAction
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
      if (error instanceof GitbeakerRequestError && error.cause?.description?.includes('Not Found')) {
        return []
      }
      if (error instanceof GitbeakerRequestError && error.cause?.description?.includes('404 Tree Not Found')) {
        return []
      }
      throw error
    }
  }

  async getProjectGroup(projectSlug: string): Promise<GroupSchema | undefined> {
    const parentGroup = await this.getOrCreateProjectGroup()
    return find(
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
    return await this.client.Users.create({
      ...user,
      skipConfirmation: true,
    }) as UserSchema
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
    const repos = this.offsetPaginate(opts => this.client.Groups.allProjects(group.id, { simple: false, ...opts }))
    for await (const repo of repos) {
      yield repo
    }
  }

  async upsertProjectGroupRepo(projectSlug: string, repoName: string, description?: string) {
    const fullPath = `${projectSlug}/${repoName}`
    const repo = await this.getOrCreateProjectGroupRepo(projectSlug, fullPath)
    const updated = await this.client.Projects.edit(repo.id, {
      name: repoName,
      path: repoName,
      topics: [TOPIC_PLUGIN_MANAGED],
      description,
    })
    return updated
  }

  async deleteProjectGroupRepo(projectSlug: string, repoName: string) {
    const fullPath = `${projectSlug}/${repoName}`
    const repo = await this.getOrCreateProjectGroupRepo(projectSlug, fullPath)
    return this.client.Projects.remove(repo.id)
  }

  async commitMirror(repoId: number) {
    this.logger.log(`Creating a GitLab mirror bootstrap commit (repoId=${repoId})`)
    const actions: CommitAction[] = [
      {
        action: 'create',
        filePath: '.gitlab-ci.yml',
        content: await readGitlabCIConfigContent(),
        execute_filemode: false,
      },
      {
        action: 'create',
        filePath: 'mirror.sh',
        content: await readMirrorScriptContent(),
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
    return this.upsertProjectGroupRepo(projectSlug, MIRROR_REPO_NAME)
  }

  async getProjectToken(projectSlug: string) {
    const group = await this.getProjectGroup(projectSlug)
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return find(
      this.offsetPaginate<{ name: string }>(
        opts => this.client.GroupAccessTokens.all(group.id, opts) as unknown as Promise<{ data: { name: string }[], paginationInfo: OffsetPagination }>,
      ),
      token => token.name === `${projectSlug}-bot`,
    )
  }

  async createProjectToken(projectSlug: string, tokenName: string, scopes: AccessTokenScopes[]) {
    const group = await this.getProjectGroup(projectSlug)
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    const expirationDays = Number(this.config.gitlabMirrorTokenExpirationDays)
    const effectiveExpirationDays = Number.isFinite(expirationDays) && expirationDays > 0 ? expirationDays : 30
    const expiryDate = new Date(Date.now() + effectiveExpirationDays * 24 * 60 * 60 * 1000)
    this.logger.log(`Creating a GitLab group access token (projectSlug=${projectSlug}, tokenName=${tokenName}, expiry=${expiryDate.toISOString().slice(0, 10)})`)
    return this.client.GroupAccessTokens.create(group.id, tokenName, scopes, expiryDate.toISOString().slice(0, 10))
  }

  async createMirrorAccessToken(projectSlug: string) {
    const tokenName = `${projectSlug}-bot`
    return this.createProjectToken(projectSlug, tokenName, ['write_repository', 'read_repository', 'read_api'])
  }

  async getOrCreateMirrorPipelineTriggerToken(projectSlug: string): Promise<PipelineTriggerTokenSchema> {
    const mirrorRepo = await this.upsertProjectMirrorRepo(projectSlug)
    this.logger.verbose(`Resolving a GitLab pipeline trigger token (projectSlug=${projectSlug}, repoId=${mirrorRepo.id})`)
    const currentTriggerToken = await find(
      this.offsetPaginate<PipelineTriggerTokenSchema>(opts => this.client.PipelineTriggerTokens.all(mirrorRepo.id, opts)),
      token => token.description === TOKEN_DESCRIPTION,
    )
    if (currentTriggerToken) {
      this.logger.verbose(`GitLab pipeline trigger token found (projectSlug=${projectSlug}, repoId=${mirrorRepo.id})`)
      return currentTriggerToken
    }
    const created = await this.client.PipelineTriggerTokens.create(mirrorRepo.id, TOKEN_DESCRIPTION)
    this.logger.log(`GitLab pipeline trigger token created (projectSlug=${projectSlug}, repoId=${mirrorRepo.id})`)
    return created
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

function hasFileContentChanged(file: { content_sha256?: string } | null | undefined, content: string) {
  return file?.content_sha256 !== digestContent(content)
}

function digestContent(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

function readGitlabCIConfigContent() {
  return readFile(join(__dirname, './files/.gitlab-ci.yml'), 'utf-8')
}

function readMirrorScriptContent() {
  return readFile(join(__dirname, './files/mirror.sh'), 'utf-8')
}
