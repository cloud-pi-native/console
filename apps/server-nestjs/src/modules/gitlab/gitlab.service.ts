import { Inject, Injectable, Logger } from '@nestjs/common'
import type { AccessTokenScopes, BaseRequestOptions, CommitAction, GroupSchema, OffsetPagination, PaginationRequestOptions, PipelineTriggerTokenSchema, RepositoryFileExpandedSchema } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { GitlabClientService } from './gitlab-client.service'
import { INFRA_GROUP_PATH, MIRROR_REPO_NAME } from './gitlab.constants'
import { join } from 'node:path'
import { find } from '@/utils/iterable'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

@Injectable()
export class GitlabService {
  private readonly logger = new Logger(GitlabService.name)

  constructor(
    @Inject(GitlabClientService) private readonly client: GitlabClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  async getGroupByPath(path: string) {
    return find(
      offsetPaginate(opts => this.client.Groups.all({ search: path, orderBy: 'path', ...opts })),
      g => g.full_path === path,
    )
  }

  async createGroup(path: string) {
    return this.client.Groups.create(path, path)
  }

  async createSubGroup(parentGroup: GroupSchema, name: string) {
    return this.client.Groups.create(name, name, { parentId: parentGroup.id })
  }

  async getOrCreateGroup(path: string) {
    const parts = path.split('/')
    const rootGroupPath = parts.shift()
    if (!rootGroupPath) throw new Error('Invalid projects root dir')

    // Find or create root
    let parentGroup = await this.getGroupByPath(rootGroupPath) ?? await this.createGroup(rootGroupPath)

    // Recursively create subgroups
    for (const part of parts) {
      const fullPath = `${parentGroup.full_path}/${part}`
      parentGroup = await this.getGroupByPath(fullPath) ?? await this.createSubGroup(parentGroup, part)
    }

    return parentGroup
  }

  async getOrCreateProjectGroup() {
    if (!this.config.projectRootPath) throw new Error('projectRootPath not configured')
    return this.getOrCreateGroup(this.config.projectRootPath)
  }

  async getOrCreateProjectSubGroup(subGroupPath: string) {
    if (!this.config.projectRootPath) throw new Error('projectRootPath not configured')
    return this.getOrCreateGroup(`${this.config.projectRootPath}/${subGroupPath}`)
  }

  async getProjectGroupPublicUrl(): Promise<string> {
    const projectGroup = await this.getOrCreateProjectGroup()
    return `${this.config.gitlabUrl}/${projectGroup.full_path}`
  }

  async getInfraGroupRepoPublicUrl(repoName: string): Promise<string> {
    const projectGroup = await this.getOrCreateProjectGroup()
    return `${this.config.gitlabUrl}/${projectGroup.full_path}/${INFRA_GROUP_PATH}/${repoName}.git`
  }

  async getProjectGroupInternalRepoUrl(subGroupPath: string, repoName: string): Promise<string> {
    const projectGroup = await this.getOrCreateProjectSubGroup(subGroupPath)
    return `${this.config.gitlabInternalUrl}/${projectGroup.full_path}/${repoName}.git`
  }

  async getOrCreateProjectGroupRepo(subGroupPath: string) {
    if (!this.config.projectRootPath) throw new Error('projectRootPath not configured')
    const fullPath = `${this.config.projectRootPath}/${subGroupPath}`
    try {
      const existingRepo = await this.client.Projects.show(fullPath)
      if (existingRepo) return existingRepo
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
    if (repo) return repo
    const parts = subGroupPath.split('/')
    const repoName = parts.pop()
    if (!repoName) throw new Error('Invalid repo path')
    const parentGroup = await this.getOrCreateProjectSubGroup(parts.join('/'))
    try {
      return await this.client.Projects.create({
        name: repoName,
        path: repoName,
        namespaceId: parentGroup.id,
      })
    } catch (error) {
      if (error instanceof GitbeakerRequestError && error.cause?.description?.includes('has already been taken')) {
        return this.client.Projects.show(fullPath)
      }
      throw error
    }
  }

  async getOrCreateInfraGroupRepo(path: string) {
    return this.getOrCreateProjectGroupRepo(join(INFRA_GROUP_PATH, path))
  }

  async getFile(repoId: number, filePath: string, ref: string = 'main') {
    try {
      return await this.client.RepositoryFiles.show(repoId, filePath, ref)
    } catch (error) {
      if (error instanceof GitbeakerRequestError && error.cause?.description?.includes('Not Found')) {
        this.logger.debug(`File not found: ${filePath}`)
      } else {
        throw error
      }
    }
  }

  async maybeCommitUpdate(
    repoId: number,
    files: { content: string, filePath: string }[],
    message: string = 'ci: :robot_face: Update file content',
    ref: string = 'main',
  ): Promise<void> {
    const promises = await Promise.all(files.map(async ({ content, filePath }) =>
      this.generateCreateOrUpdateAction(repoId, ref, filePath, content),
    ))
    const actions = promises.filter(action => !!action)
    if (actions.length === 0) {
      this.logger.debug('No files to update')
      return
    }
    await this.client.Commits.create(repoId, ref, message, actions)
  }

  async generateCreateOrUpdateAction(repoId: number, ref, filePath, content: string) {
    const file = await this.getFile(repoId, filePath, ref)
    if (file && !hasFileContentChanged(file, content)) {
      this.logger.debug(`File content is up to date, no need to commit: ${filePath}`)
      return null
    }
    return {
      action: file ? 'update' : 'create',
      filePath,
      content,
    } satisfies CommitAction
  }

  async maybeCommitDelete(repoId: number, paths: string[], ref: string = 'main'): Promise<void> {
    const actions = paths.map(path => ({
      action: 'delete',
      filePath: path,
    } satisfies CommitAction))
    if (actions.length === 0) {
      this.logger.debug('No files to delete')
      return
    }
    await this.client.Commits.create(repoId, ref, 'ci: :robot_face: Delete files', actions)
  }

  async listFiles(repoId: number, options: { path?: string, recursive?: boolean, ref?: string } = {}) {
    try {
      return await this.client.Repositories.allRepositoryTrees(repoId, {
        path: options.path ?? '/',
        recursive: options.recursive ?? false,
        ref: options.ref ?? 'main',
      })
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

  async deleteGroup(groupId: number): Promise<void> {
    await this.client.Groups.remove(groupId)
  }

  // --- Members ---

  async getGroupMembers(groupId: number) {
    return this.client.GroupMembers.all(groupId)
  }

  async addGroupMember(groupId: number, userId: number, accessLevel: number) {
    return this.client.GroupMembers.add(groupId, userId, accessLevel)
  }

  async editGroupMember(groupId: number, userId: number, accessLevel: number) {
    return this.client.GroupMembers.edit(groupId, userId, accessLevel)
  }

  async removeGroupMember(groupId: number, userId: number) {
    return this.client.GroupMembers.remove(groupId, userId)
  }

  async getUserByEmail(email: string) {
    const users = await this.client.Users.all({ search: email, orderBy: 'username' })
    if (users.length === 0) return null
    return users[0]
  }

  async createUser(email: string, username: string, name: string) {
    // Note: This requires admin token
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
      description,
    })
  }

  async commitMirror(repoId: number) {
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
  }

  async upsertProjectMirrorRepo(projectSlug: string) {
    return this.upsertProjectGroupRepo(projectSlug, MIRROR_REPO_NAME)
  }

  async getProjectToken(projectSlug: string) {
    const group = await this.getProjectGroup(projectSlug)
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return find(
      offsetPaginate(opts => this.client.GroupAccessTokens.all(group.id, opts)),
      token => token.name === `${projectSlug}-bot`,
    )
  }

  async createProjectToken(projectSlug: string, tokenName: string, scopes: AccessTokenScopes[]) {
    const group = await this.getProjectGroup(projectSlug)
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    const expirationDays = Number(this.config.gitlabMirrorTokenExpirationDays)
    const effectiveExpirationDays = Number.isFinite(expirationDays) && expirationDays > 0 ? expirationDays : 30
    const expiryDate = new Date(Date.now() + effectiveExpirationDays * 24 * 60 * 60 * 1000)
    return this.client.GroupAccessTokens.create(group.id, tokenName, scopes, expiryDate.toISOString().slice(0, 10))
  }

  async createMirrorAccessToken(projectSlug: string) {
    const tokenName = `${projectSlug}-bot`
    return this.createProjectToken(projectSlug, tokenName, ['write_repository', 'read_repository', 'read_api'])
  }

  async getOrCreateMirrorPipelineTriggerToken(projectSlug: string): Promise<PipelineTriggerTokenSchema> {
    const tokenDescription = 'mirroring-from-external-repo'
    const mirrorRepo = await this.upsertProjectMirrorRepo(projectSlug)
    const currentTriggerToken = await find(
      offsetPaginate(opts => this.client.PipelineTriggerTokens.all(mirrorRepo.id, opts)),
      token => token.description === tokenDescription,
    )
    return currentTriggerToken ?? await this.client.PipelineTriggerTokens.create(mirrorRepo.id, tokenDescription)
  }
}

function hasFileContentChanged(file: RepositoryFileExpandedSchema, content: string) {
  return file?.content_sha256 !== digestContent(content)
}

function digestContent(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

function readGitlabCIConfigContent() {
  return readFile(join(__dirname, './files/.gitlab-ci.yml'), 'utf-8')
}

async function readMirrorScriptContent() {
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
