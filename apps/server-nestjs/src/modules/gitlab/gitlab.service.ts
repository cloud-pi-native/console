import { Inject, Injectable, Logger } from '@nestjs/common'
import type { AccessTokenScopes, CommitAction, GroupSchema } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { readGitlabCIConfigContent, readMirrorScriptContent, find, offsetPaginate, hasFileContentChanged } from './gitlab.utils'
import { GitlabClientService } from './gitlab-client.service'
import { INFRA_GROUP_PATH, MIRROR_REPO_NAME } from './gitlab.constant'
import { join } from 'node:path'

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
      offsetPaginate(opts => this.client.Groups.all({ search: path, ...opts })),
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
    const repo = await find(
      offsetPaginate(opts => this.client.Projects.all({
        search: `${this.config.projectRootPath}/${subGroupPath}`,
        ...opts,
      })),
      p => p.path_with_namespace === `${this.config.projectRootPath}/${subGroupPath}`,
    )
    if (repo) return repo
    const parts = subGroupPath.split('/')
    const repoName = parts.pop()
    if (!repoName) throw new Error('Invalid repo path')
    const parentGroup = await this.getOrCreateProjectSubGroup(parts.join('/'))
    return this.client.Projects.create({
      name: repoName,
      path: repoName,
      namespaceId: parentGroup.id,
    })
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

  async removeGroupMember(groupId: number, userId: number) {
    return this.client.GroupMembers.remove(groupId, userId)
  }

  async getUserByEmail(email: string) {
    const [user] = await this.client.Users.all({ search: email })
    return user
  }

  async createUser(email: string, username: string, name: string) {
    // Note: This requires admin token usually
    return this.client.Users.create({
      email,
      username,
      name,
      password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8), // Dummy password
      skipConfirmation: true,
    })
  }

  async *getRepos(projectSlug: string) {
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
    return this.upsertProjectGroupRepo(projectSlug, MIRROR_REPO_NAME, undefined)
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
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + this.config.gitlabMirrorTokenExpirationDays)
    return this.client.GroupAccessTokens.create(group.id, tokenName, scopes, expiryDate.toLocaleDateString('en-CA'))
  }

  async createProjectMirrorAccessToken(projectSlug: string) {
    const tokenName = `${projectSlug}-bot`
    return this.createProjectToken(projectSlug, tokenName, ['write_repository', 'read_repository', 'read_api'])
  }

  async getOrCreateMirrorPipelineTriggerToken(projectSlug: string) {
    const tokenDescription = 'mirroring-from-external-repo'
    const mirrorRepo = await this.upsertProjectMirrorRepo(projectSlug)
    const currentTriggerToken = await find(
      offsetPaginate(opts => this.client.PipelineTriggerTokens.all(mirrorRepo.id, opts)),
      token => token.description === tokenDescription,
    )
    if (currentTriggerToken) return currentTriggerToken
    return this.client.PipelineTriggerTokens.create(mirrorRepo.id, tokenDescription)
  }
}
