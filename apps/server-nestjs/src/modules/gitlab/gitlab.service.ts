import { Inject, Injectable, Logger } from '@nestjs/common'
import type { AccessTokenScopes, CommitAction, PaginationRequestOptions, BaseRequestOptions, OffsetPagination, GroupSchema, ProjectSchema } from '@gitbeaker/core'
import { Gitlab } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { createHash } from 'node:crypto'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { generateGitLabCIConfig, generateMirrorScript, internalMirrorRepoName } from './gitlab.utils'

@Injectable()
export class GitlabClientService extends Gitlab {
  constructor(
    @Inject(ConfigurationService) readonly configService: ConfigurationService,
  ) {
    super({
      token: configService.gitlabToken,
      host: configService.gitlabInternalUrl,
    })
  }
}

@Injectable()
export class GitlabService {
  private readonly logger = new Logger(GitlabService.name)
  private groupRootId: number | undefined

  constructor(
    @Inject(GitlabClientService) private readonly client: GitlabClientService,
    @Inject(ConfigurationService) private readonly configService: ConfigurationService,
  ) {
  }

  async getPublicGroupUrl(): Promise<string> {
    const rootId = await this.getGroupRootId()
    const group = await this.client.Groups.show(rootId)
    return `${this.configService.gitlabUrl}/${group.full_path}`
  }

  async getPublicRepoUrl(internalRepoName: string): Promise<string> {
    const rootId = await this.getGroupRootId()
    const group = await this.client.Groups.show(rootId)
    return `${this.configService.gitlabUrl}/${group.full_path}/infra/${internalRepoName}.git`
  }

  async getInternalRepoUrl(internalRepoName: string): Promise<string> {
    const rootId = await this.getGroupRootId()
    const group = await this.client.Groups.show(rootId)
    return `${this.configService.gitlabInternalUrl}/${group.full_path}/infra/${internalRepoName}.git`
  }

  async getOrCreateInfraProject(zoneSlug: string): Promise<{ id: number, http_url_to_repo: string }> {
    const rootId = await this.getGroupRootId()
    const infraGroupName = 'infra'

    // Find or create 'infra' subgroup
    const rootGroup = await this.client.Groups.show(rootId)
    const infraGroupPath = `${rootGroup.full_path}/${infraGroupName}`

    let infraGroup = await this.find(
      this.offsetPaginate(opts => this.client.Groups.all({
        search: infraGroupName,
        ...opts,
      })),
      g => g.full_path === infraGroupPath,
    )

    if (!infraGroup) {
      infraGroup = await this.client.Groups.create(infraGroupName, infraGroupName, {
        parentId: rootId,
        visibility: 'public', // Or internal? Plugin uses internal usually but let's check
      })
    }

    // Find or create project for zone
    const projectPath = zoneSlug
    const projectFullPath = `${infraGroupPath}/${projectPath}`

    let project = await this.find(
      this.offsetPaginate(opts => this.client.Projects.all({
        search: projectPath,
        ...opts,
      })),
      p => p.path_with_namespace === projectFullPath,
    )

    if (!project) {
      project = await this.client.Projects.create({
        name: projectPath,
        path: projectPath,
        namespaceId: infraGroup.id,
        visibility: 'public', // Check visibility requirements
      })

      // Initialize with readme or empty commit?
      // Plugin creates empty repo then first commit.
      try {
        await this.client.Commits.create(project.id, 'main', 'ci: 🌱 First commit', [])
      } catch (_error) {
        // Ignore if already exists or fails (e.g. default branch creation)
      }
    }

    return {
      id: project.id,
      http_url_to_repo: project.http_url_to_repo,
    }
  }

  async commitCreateOrUpdate(
    repoId: number,
    content: string,
    filePath: string,
    message: string = 'ci: :robot_face: Update file content',
  ): Promise<void> {
    const branch = 'main'
    let action: CommitAction['action'] = 'create'

    try {
      const file = await this.client.RepositoryFiles.show(repoId, filePath, branch)
      const newContentDigest = createHash('sha256').update(content).digest('hex')
      if (file.content_sha256 === newContentDigest) {
        return // Already up to date
      }
      action = 'update'
    } catch (_error) {
      // File likely doesn't exist, proceed with create
    }

    await this.client.Commits.create(repoId, branch, message, [{
      action,
      filePath,
      content,
    }])
  }

  async commitDelete(repoId: number, paths: string[]): Promise<void> {
    if (paths.length === 0) return
    const branch = 'main'
    const actions: CommitAction[] = paths.map(path => ({
      action: 'delete',
      filePath: path,
    }))

    await this.client.Commits.create(repoId, branch, 'ci: :robot_face: Delete files', actions)
  }

  async listFiles(repoId: number, options: { path?: string, recursive?: boolean } = {}): Promise<Array<{ name: string, path: string, type: string }>> {
    try {
      const files = await this.client.Repositories.allRepositoryTrees(repoId, {
        path: options.path ?? '/',
        recursive: options.recursive ?? false,
        ref: 'main',
      })
      return files.map(f => ({
        name: f.name,
        path: f.path,
        type: f.type,
      }))
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

  // --- Project Management ---

  async getOrCreateProjectGroup(projectSlug: string): Promise<GroupSchema> {
    const parentId = await this.getGroupRootId()
    const existingGroup = await this.find(
      this.offsetPaginate(opts => this.client.Groups.all({
        search: projectSlug,
        ...opts,
      })),
      g => g.parent_id === parentId && g.name === projectSlug,
    )

    if (existingGroup) return existingGroup

    return this.client.Groups.create(projectSlug, projectSlug, {
      parentId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
    })
  }

  async getProjectGroup(projectSlug: string): Promise<GroupSchema | undefined> {
    const parentId = await this.getGroupRootId()
    return this.find(
      this.offsetPaginate(opts => this.client.Groups.allSubgroups(parentId, opts)),
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

  async findUserByUsername(username: string) {
    const [user] = await this.client.Users.all({ username })
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

  async listRepositories(projectSlug: string) {
    const group = await this.getOrCreateProjectGroup(projectSlug)
    const generator = this.offsetPaginate(opts => this.client.Groups.allProjects(group.id, { simple: false, ...opts }))
    const repositories: ProjectSchema[] = []
    for await (const repo of generator) {
      repositories.push(repo)
    }
    return repositories
  }

  async createEmptyProjectRepository(projectSlug: string, repoName: string, description?: string, clone?: boolean) {
    const group = await this.getOrCreateProjectGroup(projectSlug)
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

  async deleteRepository(repoId: number) {
    await this.client.Projects.remove(repoId)
  }

  async updateProject(repoId: number, data: Record<string, any>) {
    await this.client.Projects.edit(repoId, data)
  }

  async provisionMirror(repoId: number) {
    const mirrorFirstActions: CommitAction[] = [
      {
        action: 'create',
        filePath: '.gitlab-ci.yml',
        content: generateGitLabCIConfig(),
        execute_filemode: false,
      },
      {
        action: 'create',
        filePath: 'mirror.sh',
        content: generateMirrorScript(),
        execute_filemode: true,
      },
    ]

    await this.client.Commits.create(
      repoId,
      'main',
      'ci: :construction_worker: first mirror',
      mirrorFirstActions,
    )
  }

  // --- Tokens ---

  async getProjectToken(projectSlug: string, tokenName: string) {
    const group = await this.getProjectGroup(projectSlug)
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return this.find(
      this.offsetPaginate(opts => this.client.GroupAccessTokens.all(group.id, opts)),
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

  async revokeProjectToken(projectSlug: string, tokenId: number) {
    const group = await this.getProjectGroup(projectSlug)
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return this.client.GroupAccessTokens.revoke(group.id, tokenId)
  }

  async getMirrorProjectTriggerToken(projectSlug: string) {
    const tokenDescription = 'mirroring-from-external-repo'
    const repositoriesGenerator = await this.listRepositories(projectSlug)
    let mirrorRepo: ProjectSchema | undefined
    for await (const repo of repositoriesGenerator) {
      if (repo.name === internalMirrorRepoName) {
        mirrorRepo = repo
        break
      }
    }

    if (!mirrorRepo) throw new Error('Don\'t know how mirror repo could not exist')

    const currentTriggerToken = await this.find(
      this.offsetPaginate(opts => this.client.PipelineTriggerTokens.all(mirrorRepo.id, opts)),
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

  async deleteTriggerToken(repoId: number, tokenId: number) {
    await this.client.PipelineTriggerTokens.remove(repoId, tokenId)
  }

  // Private helpers

  private async getGroupRootId(): Promise<number> {
    if (this.groupRootId) return this.groupRootId

    const projectRootDir = this.configService.projectRootDir
    if (!projectRootDir) throw new Error('PROJECTS_ROOT_DIR not configured')

    const group = await this.find(
      this.offsetPaginate(opts => this.client.Groups.all({
        search: projectRootDir,
        ...opts,
      })),
      g => g.full_path === projectRootDir,
    )

    if (!group) {
      // Create it if not exists? Plugin logic has createGroupRoot.
      // For now throw error or implement createGroupRoot logic.
      // Let's implement createGroupRoot logic here or assume it exists.
      // Given this is migration, better to implement creation.
      return this.createGroupRoot(projectRootDir)
    }

    this.groupRootId = group.id
    return group.id
  }

  private async createGroupRoot(projectRootDir: string): Promise<number> {
    const parts = projectRootDir.split('/')
    const currentPath = parts.shift()
    if (!currentPath) throw new Error('Invalid projects root dir')

    // Find or create root
    let parentGroup = await this.find(
      this.offsetPaginate(opts => this.client.Groups.all({ search: currentPath, ...opts })),
      g => g.full_path === currentPath,
    ) ?? await this.client.Groups.create(currentPath, currentPath)

    for (const part of parts) {
      const fullPath = `${parentGroup.full_path}/${part}`
      parentGroup = await this.find(
        this.offsetPaginate(opts => this.client.Groups.all({ search: fullPath, ...opts })),
        g => g.full_path === fullPath,
      ) ?? await this.client.Groups.create(part, part, { parentId: parentGroup.id })
    }

    return parentGroup.id
  }

  private async find<T>(generator: AsyncGenerator<T>, predicate: (item: T) => boolean): Promise<T | undefined> {
    for await (const item of generator) {
      if (predicate(item)) return item
    }
    return undefined
  }

  private async *offsetPaginate<T>(
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
}
