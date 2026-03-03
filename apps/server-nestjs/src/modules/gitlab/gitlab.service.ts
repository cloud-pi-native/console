import { Inject, Injectable, Logger } from '@nestjs/common'
import type { AccessTokenScopes, CommitAction, GroupSchema, ProjectSchema } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { readGitlabCIConfigContent, readMirrorScriptContent, find, offsetPaginate, hasFileContentChanged } from './gitlab.utils'
import { GitlabClientService } from './gitlab-client.service'
import { INFRA_GROUP_NAME, INFRA_GROUP_PATH, INTERNAL_MIRROR_REPO_NAME } from './gitlab.constant'
import { join } from 'node:path'

@Injectable()
export class GitlabService {
  private readonly logger = new Logger(GitlabService.name)

  constructor(
    @Inject(GitlabClientService) private readonly client: GitlabClientService,
    @Inject(ConfigurationService) private readonly configService: ConfigurationService,
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
    if (!this.configService.projectRootPath) throw new Error('projectRootPath not configured')
    return this.getOrCreateGroup(this.configService.projectRootPath)
  }

  async getOrCreateProjectSubGroup(subGroupPath: string) {
    if (!this.configService.projectRootPath) throw new Error('projectRootPath not configured')
    return this.getOrCreateGroup(`${this.configService.projectRootPath}/${subGroupPath}`)
  }

  async getGroupPublicUrl(): Promise<string> {
    const projectGroup = await this.getOrCreateProjectGroup()
    return `${this.configService.gitlabUrl}/${projectGroup.full_path}`
  }

  async getInfraGroupRepoPublicUrl(internalRepoName: string): Promise<string> {
    const projectGroup = await this.getOrCreateProjectGroup()
    return `${this.configService.gitlabUrl}/${projectGroup.full_path}/${INFRA_GROUP_PATH}/${internalRepoName}.git`
  }

  async getInternalRepoUrl(projectSlug: string, internalRepoName: string): Promise<string> {
    const projectGroup = await this.getOrCreateProjectSubGroup(projectSlug)
    return `${this.configService.gitlabInternalUrl}/${projectGroup.full_path}/${internalRepoName}.git`
  }

  async getOrCreateProjectGroupRepo(path: string) {
    if (!this.configService.projectRootPath) throw new Error('projectRootPath not configured')
    const repo = await find(
      offsetPaginate(opts => this.client.Projects.all({
        search: `${this.configService.projectRootPath}/${path}`,
        ...opts,
      })),
      p => p.path_with_namespace === `${this.configService.projectRootPath}/${path}`,
    )
    if (repo) return repo
    const parts = path.split('/')
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
    const promises = await Promise.all(files.map(async ({content, filePath}) =>
      this.generateCreateOrUpdateAction(repoId, ref, filePath, content)
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

  async findUserByEmail(email: string) {
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

  // --- Repositories ---

  async *getRepositories(projectSlug: string) {
    const group = await this.getOrCreateProjectSubGroup(projectSlug)
    const repos = offsetPaginate(opts => this.client.Groups.allProjects(group.id, { simple: false, ...opts }))
    for await (const repo of repos) {
      yield repo
    }
  }

  async createEmptyProjectRepository(projectSlug: string, repoName: string, description?: string, clone?: boolean) {
    const group = await this.getOrCreateProjectSubGroup(projectSlug)
    const project = await this.client.Projects.create({
      name: repoName,
      path: repoName,
      namespaceId: group.id,
      description,
      // ciConfigPath: ...
    })

    if (!clone) {
      // Initialize with empty commit if not cloning
      try {
        await this.client.Commits.create(project.id, 'main', 'ci: 🌱 First commit', [])
      } catch (_e) {
        // ignore
      }
    }
    return project
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

  // --- Tokens ---

  async getProjectToken(projectSlug: string, tokenName: string) {
    const group = await this.getProjectGroup(projectSlug)
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return find(
      offsetPaginate(opts => this.client.GroupAccessTokens.all(group.id, opts)),
      token => token.name === tokenName,
    )
  }

  async createProjectToken(projectSlug: string, tokenName: string, scopes: AccessTokenScopes[]) {
    const group = await this.getProjectGroup(projectSlug)
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    return this.client.GroupAccessTokens.create(group.id, tokenName, scopes, expiryDate.toLocaleDateString('en-CA'))
  }

  async getMirrorProjectTriggerToken(projectSlug: string) {
    const tokenDescription = 'mirroring-from-external-repo'
    const repositoriesGenerator = await this.getRepositories(projectSlug)
    let mirrorRepo: ProjectSchema | undefined
    for await (const repo of repositoriesGenerator) {
      if (repo.name === INTERNAL_MIRROR_REPO_NAME) {
        mirrorRepo = repo
        break
      }
    }

    if (!mirrorRepo) throw new Error('Don\'t know how mirror repo could not exist')

    const currentTriggerToken = await find(
      offsetPaginate(opts => this.client.PipelineTriggerTokens.all(mirrorRepo.id, opts)),
      token => token.description === tokenDescription,
    )

    // Note: The logic to compare with Vault and recreate if missing is in Controller.
    // Here we just get or create.
    // Actually, plugin recreates if missing in Vault.
    // So maybe we just return current if exists.

    if (currentTriggerToken) {
      return { token: currentTriggerToken.token, repoId: mirrorRepo.id, id: currentTriggerToken.id }
    }

    const triggerToken = await this.client.PipelineTriggerTokens.create(mirrorRepo.id, tokenDescription)
    return { token: triggerToken.token, repoId: mirrorRepo.id, id: triggerToken.id }
  }
}
