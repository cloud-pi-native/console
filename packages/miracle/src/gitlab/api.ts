import type { GitlabClient } from './client.js'
import type {
  CommitAction,
  CondensedProjectSchema,
  GroupSchema,
  MemberSchema,
  ProjectSchema,
  ProjectVariableSchema,
  VariableSchema,
} from './types.js'
import { createHash } from 'node:crypto'
import { find, getAll, offsetPaginate } from './pagination.js'
import { AccessLevel } from './types.js'

type AccessLevelAllowed = AccessLevel.NO_ACCESS | AccessLevel.MINIMAL_ACCESS | AccessLevel.GUEST | AccessLevel.REPORTER | AccessLevel.DEVELOPER | AccessLevel.MAINTAINER | AccessLevel.OWNER

export const pluginManagedTopic = 'plugin-managed'

type PendingCommits = Record<number, {
  branches: Record<string, { messages: string[], actions: CommitAction[] }>
}>

export interface CreateEmptyRepositoryArgs {
  repoName: string
  description?: string
}

export class GitlabApi {
  protected api: GitlabClient
  private pendingCommits: PendingCommits = {}

  constructor(api: GitlabClient) {
    this.api = api
  }

  public async createEmptyRepository({ createFirstCommit, groupId, repoName, description, ciConfigPath }: CreateEmptyRepositoryArgs & {
    createFirstCommit: boolean
    groupId: number
    ciConfigPath?: string
  }) {
    const project = await this.api.projectsCreate({
      name: repoName,
      path: repoName,
      ciConfigPath,
      namespaceId: groupId,
      description,
    })
    if (createFirstCommit) {
      await this.api.commitsCreate(project.id, 'main', 'ci: 🌱 First commit', [])
    }
    return project
  }

  public async commitCreateOrUpdate(
    repoId: number,
    fileContent: string,
    filePath: string,
    branch: string = 'main',
    comment: string = 'ci: :robot_face: Update file content',
  ): Promise<boolean> {
    let action: CommitAction['action'] = 'create'

    const existingBranch = await find(
      offsetPaginate(opts => this.api.branchesAll(repoId, opts.page, opts.perPage), { perPage: 100 }),
      b => b.name === branch,
    )

    if (existingBranch) {
      try {
        const actualFile = await this.api.repositoryFilesShow(repoId, filePath, branch)
        if (actualFile) {
          const newContentDigest = createHash('sha256').update(fileContent).digest('hex')
          if (actualFile.content_sha256 === newContentDigest) {
            return false
          }
          action = 'update'
        }
      } catch {}
    }

    const commitAction: CommitAction = {
      action,
      file_path: filePath,
      content: fileContent,
    }
    this.addActions(repoId, branch, comment, [commitAction])
    return true
  }

  public async commitDelete(
    repoId: number,
    files: string[],
    branch: string = 'main',
    comment: string = 'ci: :robot_face: Delete files',
  ): Promise<boolean> {
    if (!files.length) return false
    const commitActions: CommitAction[] = files.map(filePath => ({ action: 'delete', file_path: filePath }))
    this.addActions(repoId, branch, comment, commitActions)
    return true
  }

  private addActions(repoId: number, branch: string, comment: string, commitActions: CommitAction[]) {
    if (!this.pendingCommits[repoId]) {
      this.pendingCommits[repoId] = { branches: {} }
    }
    if (this.pendingCommits[repoId].branches[branch]) {
      this.pendingCommits[repoId].branches[branch].actions.push(...commitActions)
      this.pendingCommits[repoId].branches[branch].messages.push(comment)
    } else {
      this.pendingCommits[repoId].branches[branch] = {
        actions: commitActions,
        messages: [comment],
      }
    }
  }

  public async commitFiles() {
    let filesUpdated = 0
    for (const [repoId, repo] of Object.entries(this.pendingCommits)) {
      for (const [branch, details] of Object.entries(repo.branches)) {
        const filesNumber = details.actions.length
        if (!filesNumber) continue
        filesUpdated += filesNumber
        const message = [`ci: :robot_face: Update ${filesNumber} file${filesNumber > 1 ? 's' : ''}`, ...details.messages.filter(m => m)].join('\n')
        await this.api.commitsCreate(Number(repoId), branch, message, details.actions)
      }
    }
    return filesUpdated
  }

  public async listFiles(repoId: number, options: { path?: string, ref?: string, recursive?: boolean } = {}) {
    const response = await getAll(offsetPaginate(
      opts => this.api.repositoriesAllRepositoryTrees(repoId, {
        path: options.path ?? '/',
        ref: options.ref ?? 'main',
        recursive: options.recursive ?? false,
      }, opts.page, opts.perPage),
      { perPage: 100 },
    ))
    return response
  }

  public async deleteRepository(repoId: number, fullPath: string) {
    await this.api.projectsRemove(repoId)
    return this.api.projectsRemove(repoId, { permanentlyRemove: true, fullPath: `${fullPath}-deletion_scheduled-${repoId}` })
  }
}

const infraGroupName = 'Infra'
const infraGroupPath = 'infra'

export class GitlabZoneApi extends GitlabApi {
  private infraProjectsByZoneSlug: Map<string, ProjectSchema> = new Map()
  private infraGroup: GroupSchema | undefined

  public async getOrCreateInfraGroup(getRootId: () => Promise<number>): Promise<GroupSchema> {
    if (this.infraGroup) return this.infraGroup
    const rootId = await getRootId()

    const existingParentGroup = await find(
      offsetPaginate(opts => this.api.groupsAll({ search: infraGroupName }, opts.page, opts.perPage), { perPage: 100 }),
      group => group.parent_id === rootId && group.name === infraGroupName,
    )

    this.infraGroup = existingParentGroup ?? await this.api.groupsCreate(infraGroupName, infraGroupPath, {
      parentId: rootId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
      description: 'Group that hosts infrastructure-as-code repositories for all zones (ArgoCD pull targets).',
    })
    return this.infraGroup
  }

  public async getOrCreateInfraProject(zone: string, getRootId: () => Promise<number>): Promise<ProjectSchema> {
    if (this.infraProjectsByZoneSlug.has(zone)) return this.infraProjectsByZoneSlug.get(zone)!
    const infraGroup = await this.getOrCreateInfraGroup(getRootId)

    const project = await find(
      offsetPaginate(opts => this.api.groupsAllProjects(infraGroup.id, { search: zone, simple: true }, opts.page, opts.perPage), { perPage: 100 }),
      repo => repo.name === zone,
    ) ?? await this.createEmptyRepository({
      repoName: zone,
      groupId: infraGroup.id,
      description: 'Repository hosting deployment files for this zone.',
      createFirstCommit: true,
    })

    this.infraProjectsByZoneSlug.set(zone, project)
    return project
  }
}

export class GitlabProjectApi extends GitlabApi {
  private readonly projectSlug: string
  private gitlabGroup: GroupSchema | undefined
  private specialRepositories: string[] = ['infra-apps', 'mirror']
  private zoneApi: GitlabZoneApi

  constructor(api: GitlabClient, args: { slug: string }) {
    super(api)
    this.projectSlug = args.slug
    this.zoneApi = new GitlabZoneApi(api)
  }

  private async createProjectGroup(getRootId: () => Promise<number>): Promise<GroupSchema> {
    const parentId = await getRootId()
    const existingGroup = await find(
      offsetPaginate(opts => this.api.groupsAll({ search: this.projectSlug }, opts.page, opts.perPage), { perPage: 100 }),
      group => group.parent_id === parentId && group.name === this.projectSlug,
    )
    if (existingGroup) return existingGroup
    return this.api.groupsCreate(this.projectSlug, this.projectSlug, {
      parentId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
    })
  }

  public async getProjectGroup(getRootId: () => Promise<number>, queryByCustomAttribute?: Record<string, string>) {
    if (this.gitlabGroup) return this.gitlabGroup
    const parentId = await getRootId()

    if (queryByCustomAttribute) {
      const fast = await find(
        offsetPaginate(opts => this.api.groupsAllSubgroups(parentId, { ...queryByCustomAttribute }, opts.page, opts.perPage), { perPage: 100 }),
        group => group.name === this.projectSlug,
      )
      if (fast) {
        this.gitlabGroup = fast
        return this.gitlabGroup
      }
    }

    this.gitlabGroup = await find(
      offsetPaginate(opts => this.api.groupsAllSubgroups(parentId, { search: this.projectSlug }, opts.page, opts.perPage), { perPage: 100 }),
      group => group.name === this.projectSlug,
    )
    return this.gitlabGroup
  }

  public async getOrCreateProjectGroup(getRootId: () => Promise<number>, queryByCustomAttribute?: Record<string, string>) {
    const existing = await this.getProjectGroup(getRootId, queryByCustomAttribute)
    if (existing) return existing
    return this.createProjectGroup(getRootId)
  }

  public async getOrCreateInfraProject(zone: string, getRootId: () => Promise<number>) {
    return this.zoneApi.getOrCreateInfraProject(zone, getRootId)
  }

  public async getProjectToken(groupId: number, tokenName: string) {
    return find(offsetPaginate(opts => this.api.groupAccessTokensAll(groupId, opts.page, opts.perPage), { perPage: 100 }), token => token.name === tokenName)
  }

  public async createProjectToken(groupId: number, tokenName: string, scopes: string[]) {
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    return this.api.groupAccessTokensCreate(groupId, tokenName, scopes, expiryDate.toLocaleDateString('en-CA'))
  }

  public async revokeProjectToken(groupId: number, tokenId: number) {
    return this.api.groupAccessTokensRevoke(groupId, tokenId)
  }

  public async listRepositories(groupId: number): Promise<CondensedProjectSchema[]> {
    const projects = await getAll(offsetPaginate(opts => this.api.groupsAllProjects(groupId, { simple: false }, opts.page, opts.perPage), { perPage: 100 }))
    return Promise.all(projects.map(async (project) => {
      if (this.specialRepositories.includes(project.name) && !project.topics?.includes(pluginManagedTopic)) {
        return this.api.projectsEdit(project.id, { topics: project.topics ? [...project.topics, pluginManagedTopic] : [pluginManagedTopic] })
      }
      return project
    }))
  }

  public async createEmptyProjectRepository(groupId: number, args: CreateEmptyRepositoryArgs & { clone?: boolean }) {
    return this.createEmptyRepository({
      repoName: args.repoName,
      groupId,
      description: args.description,
      ciConfigPath: args.clone ? '.gitlab-ci-dso.yml' : undefined,
      createFirstCommit: !args.clone,
    })
  }

  public async getGroupMembers(groupId: number): Promise<MemberSchema[]> {
    return getAll(offsetPaginate(opts => this.api.groupMembersAll(groupId, opts.page, opts.perPage), { perPage: 100 }))
  }

  public async addGroupMember(groupId: number, userId: number, accessLevel: AccessLevelAllowed = AccessLevel.DEVELOPER) {
    return this.api.groupMembersAdd(groupId, userId, accessLevel)
  }

  public async editGroupMember(groupId: number, userId: number, accessLevel: AccessLevelAllowed = AccessLevel.DEVELOPER) {
    return this.api.groupMembersEdit(groupId, userId, accessLevel)
  }

  public async removeGroupMember(groupId: number, userId: number) {
    return this.api.groupMembersRemove(groupId, userId)
  }

  public async getGitlabGroupVariables(groupId: number): Promise<VariableSchema[]> {
    return getAll(offsetPaginate(opts => this.api.groupVariablesAll(groupId, opts.page, opts.perPage), { perPage: 100 }))
  }

  public async setGitlabGroupVariable(groupId: number, listVars: VariableSchema[], toSetVariable: VariableSchema): Promise<'created' | 'updated' | 'already up-to-date'> {
    const currentVariable = listVars.find(v => v.key === toSetVariable.key)
    if (currentVariable) {
      if (
        currentVariable.masked !== toSetVariable.masked
        || currentVariable.value !== toSetVariable.value
        || currentVariable.protected !== toSetVariable.protected
        || currentVariable.variable_type !== toSetVariable.variable_type
      ) {
        await this.api.groupVariablesEdit(groupId, toSetVariable.key, toSetVariable.value, {
          variableType: toSetVariable.variable_type,
          masked: toSetVariable.masked,
          protected: toSetVariable.protected,
          filter: { environment_scope: '*' },
        })
        return 'updated'
      }
      return 'already up-to-date'
    }
    await this.api.groupVariablesCreate(groupId, toSetVariable.key, toSetVariable.value, {
      variableType: toSetVariable.variable_type,
      masked: toSetVariable.masked,
      protected: toSetVariable.protected,
    })
    return 'created'
  }

  public async getGitlabRepoVariables(repoId: number): Promise<VariableSchema[]> {
    return getAll(offsetPaginate(opts => this.api.projectVariablesAll(repoId, opts.page, opts.perPage), { perPage: 100 }))
  }

  public async setGitlabRepoVariable(repoId: number, listVars: VariableSchema[], toSetVariable: ProjectVariableSchema): Promise<'created' | 'updated' | 'already up-to-date'> {
    const currentVariable = listVars.find(v => v.key === toSetVariable.key)
    if (currentVariable) {
      if (
        currentVariable.masked !== toSetVariable.masked
        || currentVariable.value !== toSetVariable.value
        || currentVariable.protected !== toSetVariable.protected
        || currentVariable.variable_type !== toSetVariable.variable_type
      ) {
        await this.api.projectVariablesEdit(repoId, toSetVariable.key, toSetVariable.value, {
          variableType: toSetVariable.variable_type,
          masked: toSetVariable.masked,
          protected: toSetVariable.protected,
          filter: { environment_scope: toSetVariable.environment_scope },
        })
        return 'updated'
      }
      return 'already up-to-date'
    }
    await this.api.projectVariablesCreate(repoId, toSetVariable.key, toSetVariable.value, {
      variableType: toSetVariable.variable_type,
      masked: toSetVariable.masked,
      protected: toSetVariable.protected,
      environmentScope: toSetVariable.environment_scope,
    })
    return 'created'
  }

  public async getMirrorProjectTriggerToken(mirrorProjectId: number, tokenDescription: string) {
    const currentTriggerToken = await find(
      offsetPaginate(opts => this.api.pipelineTriggerTokensAll(mirrorProjectId, opts.page, opts.perPage), { perPage: 100 }),
      token => token.description === tokenDescription,
    )
    if (currentTriggerToken) return currentTriggerToken
    return this.api.pipelineTriggerTokensCreate(mirrorProjectId, tokenDescription)
  }

  public async triggerMirror(mirrorProjectId: number, targetRepo: string, syncAllBranches: boolean, branchName?: string) {
    if (this.specialRepositories.includes(targetRepo)) {
      throw new Error('User requested for invalid mirroring')
    }
    return this.api.pipelinesCreate(mirrorProjectId, 'main', [
      { key: 'SYNC_ALL', value: syncAllBranches.toString() },
      { key: 'GIT_BRANCH_DEPLOY', value: branchName ?? '' },
      { key: 'PROJECT_NAME', value: targetRepo },
    ])
  }
}
