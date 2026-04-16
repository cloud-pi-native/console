import type {
  AccessTokenScopes,
  BaseRequestOptions,
  CommitAction,
  CondensedGroupSchema,
  CondensedProjectSchema,
  Gitlab,
  GroupSchema,
  OffsetPagination,
  PaginationRequestOptions,
  PipelineTriggerTokenSchema,
} from '@gitbeaker/core'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { find } from '../../utils/iterable'
import { INFRA_GROUP_PATH, MIRROR_REPO_NAME, TOKEN_DESCRIPTION, TOPIC_PLUGIN_MANAGED } from './gitlab.constants'

export const GITLAB_REST_CLIENT = Symbol('GITLAB_REST_CLIENT')

@Injectable()
export class GitlabClientService {
  private readonly logger = new Logger(GitlabClientService.name)

  constructor(
    @Inject(ConfigurationService) readonly config: ConfigurationService,
    @Inject(GITLAB_REST_CLIENT) private readonly client: Gitlab,
  ) {
  }

  async getGroupByPath(path: string) {
    this.logger.verbose(`Looking up a GitLab group by path ${path}`)
    return find(
      offsetPaginate(opts => this.client.Groups.all({ search: path, orderBy: 'path', ...opts })),
      g => g.full_path === path,
    )
  }

  async createGroup(path: string) {
    this.logger.log(`Creating a GitLab group at path ${path}`)
    return this.client.Groups.create(path, path)
  }

  async createSubGroup(parentGroup: CondensedGroupSchema, name: string) {
    this.logger.log(`Creating a GitLab subgroup ${parentGroup.full_path}/${name} (parentId=${parentGroup.id})`)
    return this.client.Groups.create(name, name, { parentId: parentGroup.id })
  }

  async getOrCreateGroupByPath(path: string) {
    const parts = path.split('/')
    const rootGroupPath = parts.shift()
    if (!rootGroupPath) throw new Error('Invalid projects root dir')

    this.logger.verbose(`Resolving GitLab group path ${path} (depth=${1 + parts.length})`)
    let parentGroup = await this.getGroupByPath(rootGroupPath) ?? await this.createGroup(rootGroupPath)

    for (const part of parts) {
      const fullPath = `${parentGroup.full_path}/${part}`
      parentGroup = await this.getGroupByPath(fullPath) ?? await this.createSubGroup(parentGroup, part)
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

  async getOrCreateProjectGroupRepo(subGroupPath: string) {
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
      offsetPaginate(opts => this.client.Projects.all({
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
      } as any)
      this.logger.log(`Created a GitLab project repository (path=${fullPath}, repoId=${created.id})`)
      return created
    } catch (error) {
      if (error instanceof GitbeakerRequestError && error.cause?.description?.includes('has already been taken')) {
        this.logger.warn(`GitLab project repository already exists (race); reloading ${fullPath}`)
        return this.client.Projects.show(fullPath)
      }
      throw error
    }
  }

  async getOrCreateInfraGroupRepo(path: string) {
    return this.getOrCreateProjectGroupRepo(join(INFRA_GROUP_PATH, path))
  }

  async getFile(repo: CondensedProjectSchema, filePath: string, ref: string = 'main') {
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
    repo: CondensedProjectSchema,
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

  async generateCreateOrUpdateAction(repo: CondensedProjectSchema, ref: string, filePath: string, content: string) {
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

  async listFiles(repo: CondensedProjectSchema, options: { path?: string, recursive?: boolean, ref?: string } = {}) {
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
      offsetPaginate(opts => this.client.Groups.allSubgroups(parentGroup.id, opts)),
      g => g.name === projectSlug,
    )
  }

  async deleteGroup(group: CondensedGroupSchema): Promise<void> {
    this.logger.verbose(`Deleting GitLab group ${group.full_path} (groupId=${group.id})`)
    await this.client.Groups.remove(group.id)
  }

  async getGroupMembers(group: CondensedGroupSchema) {
    this.logger.verbose(`Loading GitLab group members (groupId=${group.id})`)
    return this.client.GroupMembers.all(group.id)
  }

  async addGroupMember(group: CondensedGroupSchema, userId: number, accessLevel: number) {
    this.logger.verbose(`Adding a GitLab group member (groupId=${group.id}, userId=${userId}, accessLevel=${accessLevel})`)
    return this.client.GroupMembers.add(group.id, userId, accessLevel)
  }

  async editGroupMember(group: CondensedGroupSchema, userId: number, accessLevel: number) {
    this.logger.verbose(`Editing a GitLab group member (groupId=${group.id}, userId=${userId}, accessLevel=${accessLevel})`)
    return this.client.GroupMembers.edit(group.id, userId, accessLevel)
  }

  async removeGroupMember(group: CondensedGroupSchema, userId: number) {
    this.logger.verbose(`Removing a GitLab group member (groupId=${group.id}, userId=${userId})`)
    return this.client.GroupMembers.remove(group.id, userId)
  }

  async getUserByEmail(email: string) {
    const users = await this.client.Users.all({ search: email, orderBy: 'username' })
    if (users.length === 0) return null
    return users[0]
  }

  async createUser(email: string, username: string, name: string) {
    this.logger.log(`Creating a GitLab user (email=${email}, username=${username})`)
    return this.client.Users.create({
      email,
      username,
      name,
      skipConfirmation: true,
    })
  }

  async* getRepos(projectSlug: string) {
    const group = await this.getOrCreateProjectSubGroup(projectSlug)
    const repos = offsetPaginate(opts => this.client.Groups.allProjects(group.id, { simple: false, ...opts }))
    for await (const repo of repos) {
      yield repo
    }
  }

  async upsertProjectGroupRepo(projectSlug: string, repoName: string, description?: string) {
    const repo = await this.getOrCreateProjectGroupRepo(`${projectSlug}/${repoName}`)
    return this.client.Projects.edit(repo.id, {
      name: repoName,
      path: repoName,
      topics: [TOPIC_PLUGIN_MANAGED],
      description,
    })
  }

  async deleteProjectGroupRepo(projectSlug: string, repoName: string) {
    const repo = await this.getOrCreateProjectGroupRepo(`${projectSlug}/${repoName}`)
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
      offsetPaginate<{ name: string }>(opts => this.client.GroupAccessTokens.all(group.id, opts) as any),
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
      offsetPaginate<PipelineTriggerTokenSchema>(opts => this.client.PipelineTriggerTokens.all(mirrorRepo.id, opts) as any),
      token => token.description === TOKEN_DESCRIPTION,
    )
    if (currentTriggerToken) {
      this.logger.verbose(`GitLab pipeline trigger token found (projectSlug=${projectSlug}, repoId=${mirrorRepo.id})`)
      return currentTriggerToken as any
    }
    const created = await this.client.PipelineTriggerTokens.create(mirrorRepo.id, TOKEN_DESCRIPTION)
    this.logger.log(`GitLab pipeline trigger token created (projectSlug=${projectSlug}, repoId=${mirrorRepo.id})`)
    return created as any
  }
}

function hasFileContentChanged(file: any, content: string) {
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

export async function* offsetPaginate<T>(
  request: (options: PaginationRequestOptions<'offset'> & BaseRequestOptions<true>) => Promise<{ data: T[], paginationInfo: OffsetPagination }>,
): AsyncGenerator<T> {
  let page: number | null = 1
  while (page !== null) {
    const { data, paginationInfo } = await request({ page, showExpanded: true, pagination: 'offset' })
    for (const item of data) {
      yield item
    }
    page = paginationInfo.next ? paginationInfo.next : null
  }
}
