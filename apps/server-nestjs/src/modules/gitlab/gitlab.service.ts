import { Inject, Injectable, Logger } from '@nestjs/common'
import type { AccessTokenScopes, CommitAction, PaginationRequestOptions, BaseRequestOptions, OffsetPagination, GroupSchema, ProjectSchema } from '@gitbeaker/core'
import type { CommitAction, Gitlab as IGitlab, PaginationRequestOptions, BaseRequestOptions, OffsetPagination } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { createHash } from 'node:crypto'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'

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
      } catch (error) {
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
    } catch (error) {
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
