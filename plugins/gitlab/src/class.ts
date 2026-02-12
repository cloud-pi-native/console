import { createHash } from 'node:crypto'
import { PluginApi, type Project, type UniqueRepo } from '@cpn-console/hooks'
import type { AccessTokenScopes, CommitAction, GroupSchema, MemberSchema, ProjectVariableSchema, VariableSchema } from '@gitbeaker/rest'
import type { AllRepositoryTreesOptions, CondensedProjectSchema, Gitlab, ProjectSchema, RepositoryFileExpandedSchema, BranchSchema } from '@gitbeaker/core'
import { AccessLevel } from '@gitbeaker/core'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/vault-project-api.js'
import { objectEntries } from '@cpn-console/shared'
import type { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { find, getApi, getAll, getGroupRootId, infraAppsRepoName, internalMirrorRepoName } from './utils.js'
import config from './config.js'

type setVariableResult = 'created' | 'updated' | 'already up-to-date'
type AccessLevelAllowed = AccessLevel.NO_ACCESS | AccessLevel.MINIMAL_ACCESS | AccessLevel.GUEST | AccessLevel.REPORTER | AccessLevel.DEVELOPER | AccessLevel.MAINTAINER | AccessLevel.OWNER
const infraGroupName = 'Infra'
const infraGroupPath = 'infra'
export const pluginManagedTopic = 'plugin-managed'
interface GitlabMirrorSecret {
  MIRROR_USER: string
  MIRROR_TOKEN: string
}

interface RepoSelect {
  mirror?: CondensedProjectSchema
  target?: CondensedProjectSchema
}
type PendingCommits = Record<number, {
  branches: Record<string, { messages: string[], actions: CommitAction[] } >
}>

interface CreateEmptyRepositoryArgs {
  repoName: string
  description?: string
}

export class GitlabApi extends PluginApi {
  protected api: Gitlab<false>
  private pendingCommits: PendingCommits = {}

  constructor() {
    super()
    this.api = getApi()
  }

  public async createEmptyRepository({ createFirstCommit, groupId, repoName, description, ciConfigPath }: CreateEmptyRepositoryArgs & {
    createFirstCommit: boolean
    groupId: number
    ciConfigPath?: string
  }) {
    const project = await this.api.Projects.create({
      name: repoName,
      path: repoName,
      ciConfigPath,
      namespaceId: groupId,
      description,
    })
    // Dépôt tout juste créé, zéro branche => pas d'erreur (filesTree undefined)
    if (createFirstCommit) {
      await this.api.Commits.create(project.id, 'main', 'ci: 🌱 First commit', [])
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

    const branches = await getAll<BranchSchema>(opts => this.api.Branches.all(repoId, opts))
    if (branches.some(b => b.name === branch)) {
      let actualFile: RepositoryFileExpandedSchema | undefined
      try {
        actualFile = await this.api.RepositoryFiles.show(repoId, filePath, branch)
      } catch (_) {}
      if (actualFile) {
        const newContentDigest = createHash('sha256').update(fileContent).digest('hex')
        if (actualFile.content_sha256 === newContentDigest) {
          // Already up-to-date
          return false
        }
        // Update needed
        action = 'update'
      }
    }

    const commitAction: CommitAction = {
      action,
      filePath,
      content: fileContent,
    }
    this.addActions(repoId, branch, comment, [commitAction])

    return true
  }

  /**
   * Fonction pour supprimer une liste de fichiers d'un repo
   * @param repoId
   * @param files
   * @param branch
   * @param comment
   */
  public async commitDelete(
    repoId: number,
    files: string[],
    branch: string = 'main',
    comment: string = 'ci: :robot_face: Delete files',
  ): Promise<boolean> {
    if (files.length) {
      const commitActions: CommitAction[] = files.map((filePath) => {
        return {
          action: 'delete',
          filePath,
        }
      })
      this.addActions(repoId, branch, comment, commitActions)
      return true
    }
    return false
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
    let filesUpdated: number = 0
    for (const [id, repo] of objectEntries(this.pendingCommits)) {
      for (const [branch, details] of objectEntries(repo.branches)) {
        const filesNumber = details.actions.length
        if (filesNumber) {
          filesUpdated += filesNumber
          const message = [`ci: :robot_face: Update ${filesNumber} file${filesNumber > 1 ? 's' : ''}`, ...details.messages.filter(m => m)].join('\n')
          await this.api.Commits.create(id, branch, message, details.actions)
        }
      }
    }
    return filesUpdated
  }

  public async listFiles(repoId: number, options: AllRepositoryTreesOptions = {}) {
    options.path = options?.path ?? '/'
    options.ref = options?.ref ?? 'main'
    options.recursive = options?.recursive ?? false
    try {
      const files = await getAll(opts => this.api.Repositories.allRepositoryTrees(repoId, { ...options, ...opts }))
      // if (depth >= 0) {
      //   for (const file of files) {
      //     if (file.type !== 'tree') {
      //       return []
      //     }
      //     const childrenFiles = await this.listFiles(repoId, { depth: depth - 1, ...options, path: file.path })
      //     console.trace({ file, childrenFiles })

      //     files.push(...childrenFiles)
      //   }
      // }
      return files
    } catch (error) {
      const { cause } = error as GitbeakerRequestError
      if (cause?.description.includes('Not Found')) {
        // Empty repository, with zero commit ==> Zero files
        return []
      } else {
        throw error
      }
    }
  }

  public async deleteRepository(repoId: number, fullPath: string) {
    await this.api.Projects.remove(repoId) // Marks for deletion
    return this.api.Projects.remove(repoId, { permanentlyRemove: true, fullPath: `${fullPath}-deletion_scheduled-${repoId}` }) // Effective deletion
  }
}

export class GitlabZoneApi extends GitlabApi {
  private infraProjectsByZoneSlug: Map<string, ProjectSchema>

  constructor() {
    super()
    this.infraProjectsByZoneSlug = new Map()
  }

  // Group Infra
  public async getOrCreateInfraGroup(): Promise<GroupSchema> {
    const rootId = await getGroupRootId()
    // Get or create projects_root_dir/infra group
    const existingParentGroup = await find(opts => this.api.Groups.all({ ...opts, search: infraGroupName }), group => group.parent_id === rootId && group.name === infraGroupName, {})
    return existingParentGroup || await this.api.Groups.create(infraGroupName, infraGroupPath, {
      parentId: rootId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
      description: 'Group that hosts infrastructure-as-code repositories for all zones (ArgoCD pull targets).',
    })
  }

  public async getOrCreateInfraProject(zone: string): Promise<ProjectSchema> {
    if (this.infraProjectsByZoneSlug.has(zone)) {
      return this.infraProjectsByZoneSlug.get(zone)!
    }
    const infraGroup = await this.getOrCreateInfraGroup()
    // Get or create projects_root_dir/infra/zone
    const project = await find(opts => this.api.Groups.allProjects(infraGroup.id, {
      search: zone,
      simple: true,
      ...opts,
    }), repo => repo.name === zone) ?? await this.createEmptyRepository({
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
  private project: Project | UniqueRepo
  private gitlabGroup: GroupSchema | undefined
  private specialRepositories: string[] = [infraAppsRepoName, internalMirrorRepoName]
  private zoneApi: GitlabZoneApi

  constructor(project: Project | UniqueRepo) {
    super()
    this.project = project
    this.api = getApi()
    this.zoneApi = new GitlabZoneApi()
  }

  // Group Project
  private async createProjectGroup(): Promise<GroupSchema> {
    const parentId = await getGroupRootId()
    const existingGroup = await find(opts => this.api.Groups.all({ ...opts, search: this.project.slug }), group => group.parent_id === parentId && group.name === this.project.slug, {})

    if (existingGroup) return existingGroup

    return this.api.Groups.create(this.project.slug, this.project.slug, {
      parentId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
    })
  }

  public async getProjectGroup(): Promise<GroupSchema | undefined> {
    if (this.gitlabGroup) return this.gitlabGroup
    const parentId = await getGroupRootId()
    this.gitlabGroup = await find(opts => this.api.Groups.allSubgroups(parentId, opts), group => group.name === this.project.slug, {})
    return this.gitlabGroup
  }

  public async getOrCreateProjectGroup(): Promise<GroupSchema> {
    const group = await this.getProjectGroup()
    if (group) return group
    return this.createProjectGroup()
  }

  public async getPublicGroupUrl() {
    return `${config().publicUrl}/${config().projectsRootDir}/${this.project.slug}`
  }

  public async getInternalGroupUrl() {
    return `${config().internalUrl}/${config().projectsRootDir}/${this.project.slug}`
  }

  // Tokens
  public async getProjectMirrorCreds(vaultApi: VaultProjectApi): Promise<GitlabMirrorSecret> {
    const tokenName = `${this.project.slug}-bot`
    const currentToken = await this.getProjectToken(tokenName)
    const creds: GitlabMirrorSecret = {
      MIRROR_USER: '',
      MIRROR_TOKEN: '',
    }
    if (currentToken) {
      const vaultSecret = await vaultApi.read('tech/GITLAB_MIRROR', { throwIfNoEntry: false }) as { data: GitlabMirrorSecret }
      if (vaultSecret) {
        try {
          const group = await this.getProjectGroup()
          if (!group) throw new Error('Group not created yet')

          const res = await fetch(`${config().internalUrl}/api/v4/groups/${group.id}`, {
            headers: { 'PRIVATE-TOKEN': vaultSecret.data.MIRROR_TOKEN },
          })

          if (res.ok) {
            return vaultSecret.data // valid token hence early exit
          }

          throw new Error('Invalid token')
        } catch (error) {
          console.warn('Warning:', error)
          await this.revokeProjectToken(currentToken.id)
        }
      }
    }
    const newToken = await this.createProjectToken(tokenName, ['write_repository', 'read_repository', 'read_api'])
    creds.MIRROR_TOKEN = newToken.token
    creds.MIRROR_USER = newToken.name
    await vaultApi.write(creds, 'tech/GITLAB_MIRROR')
    return creds
  }

  public async getProjectId(projectName: string) {
    const projectGroup = await this.getProjectGroup()
    if (!projectGroup) throw new Error(`Gitlab inaccessible, impossible de trouver le groupe ${this.project.slug}`)

    const project = await find(opts => this.api.Groups.allProjects(projectGroup.id, {
      search: projectName,
      simple: true,
      ...opts,
    }), repo => repo.name === projectName, {})

    return project?.id
  }

  public async getProjectById(projectId: number) {
    return this.api.Projects.show(projectId)
  }

  public async getOrCreateInfraProject(zone: string) {
    return await this.zoneApi.getOrCreateInfraProject(zone)
  }

  public async getProjectToken(tokenName: string) {
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return find(opts => this.api.GroupAccessTokens.all(group.id, opts), token => token.name === tokenName, {})
  }

  public async createProjectToken(tokenName: string, scopes: AccessTokenScopes[]) {
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    return this.api.GroupAccessTokens.create(group.id, tokenName, scopes, expiryDate.toLocaleDateString('en-CA'))
  }

  public async revokeProjectToken(tokenId: number) {
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return this.api.GroupAccessTokens.revoke(group.id, tokenId)
  }

  // Triggers
  public async getMirrorProjectTriggerToken(vaultApi: VaultProjectApi) {
    const tokenDescription = 'mirroring-from-external-repo'
    const gitlabRepositories = await this.listRepositories()
    const mirrorRepo = gitlabRepositories.find(repo => repo.name === internalMirrorRepoName)
    if (!mirrorRepo) throw new Error('Don\'t know how mirror repo could not exist')
    const currentTriggerToken = await find(opts => this.api.PipelineTriggerTokens.all(mirrorRepo.id, opts), token => token.description === tokenDescription, {})

    const tokenVaultSecret = await vaultApi.read('GITLAB', { throwIfNoEntry: false })

    if (currentTriggerToken && !tokenVaultSecret?.data?.GIT_MIRROR_TOKEN) {
      await this.api.PipelineTriggerTokens.remove(mirrorRepo.id, currentTriggerToken.id)
    }
    const triggerToken = await this.api.PipelineTriggerTokens.create(mirrorRepo.id, tokenDescription)
    return { token: triggerToken.token, repoId: mirrorRepo.id }
  }

  // Repositories
  public async getPublicRepoUrl(repoName: string) {
    return `${await this.getPublicGroupUrl()}/${repoName}.git`
  }

  public async getInternalRepoUrl(repoName: string) {
    return `${await this.getInternalGroupUrl()}/${repoName}.git`
  }

  public async listRepositories() {
    const group = await this.getOrCreateProjectGroup()
    const projects = await getAll(opts => this.api.Groups.allProjects(group.id, { simple: false, ...opts }))
    return Promise.all(projects.map(async (project) => {
      if (this.specialRepositories.includes(project.name) && (!project.topics || !project.topics.includes(pluginManagedTopic))) {
        return this.api.Projects.edit(project.id, { topics: project.topics ? [...project.topics, pluginManagedTopic] : [pluginManagedTopic] })
      }
      return project
    }))
  }

  public async createEmptyProjectRepository({ repoName, description, clone }: CreateEmptyRepositoryArgs & { clone?: boolean }) {
    const namespaceId = (await this.getOrCreateProjectGroup()).id
    return this.createEmptyRepository({
      repoName,
      groupId: namespaceId,
      description,
      ciConfigPath: clone ? '.gitlab-ci-dso.yml' : undefined,
      createFirstCommit: !clone,
    })
  }

  // Special Repositories
  public async getSpecialRepositories(): Promise<string[]> {
    return this.specialRepositories
  }

  public async addSpecialRepositories(name: string) {
    if (!this.specialRepositories.includes(name)) {
      this.specialRepositories.push(name)
    }
  }

  // Group members
  public async getGroupMembers() {
    const group = await this.getOrCreateProjectGroup()
    return getAll(opts => this.api.GroupMembers.all(group.id, opts))
  }

  public async addGroupMember(userId: number, accessLevel: AccessLevelAllowed = AccessLevel.DEVELOPER): Promise<MemberSchema> {
    const group = await this.getOrCreateProjectGroup()
    return this.api.GroupMembers.add(group.id, userId, accessLevel)
  }

  public async removeGroupMember(userId: number) {
    const group = await this.getOrCreateProjectGroup()
    return this.api.GroupMembers.remove(group.id, userId)
  }

  // CI Variables
  public async getGitlabGroupVariables(): Promise<VariableSchema[]> {
    const group = await this.getOrCreateProjectGroup()
    return await getAll(opts => this.api.GroupVariables.all(group.id, opts))
  }

  public async setGitlabGroupVariable(listVars: VariableSchema[], toSetVariable: VariableSchema): Promise<setVariableResult> {
    const group = await this.getOrCreateProjectGroup()
    const currentVariable = listVars.find(v => v.key === toSetVariable.key)
    if (currentVariable) {
      if (
        currentVariable.masked !== toSetVariable.masked
        || currentVariable.value !== toSetVariable.value
        || currentVariable.protected !== toSetVariable.protected
        || currentVariable.variable_type !== toSetVariable.variable_type
      ) {
        await this.api.GroupVariables.edit(
          group.id,
          toSetVariable.key,
          toSetVariable.value,
          {
            variableType: toSetVariable.variable_type,
            masked: toSetVariable.masked,
            protected: toSetVariable.protected,
            filter: { environment_scope: '*' },
          },
        )
        return 'updated'
      }
      return 'already up-to-date'
    }
    await this.api.GroupVariables.create(
      group.id,
      toSetVariable.key,
      toSetVariable.value,
      {
        variableType: toSetVariable.variable_type,
        masked: toSetVariable.masked,
        protected: toSetVariable.protected,

      },
    )
    return 'created'
  }

  public async getGitlabRepoVariables(repoId: number): Promise<VariableSchema[]> {
    return await getAll(opts => this.api.ProjectVariables.all(repoId, opts))
  }

  public async setGitlabRepoVariable(repoId: number, listVars: VariableSchema[], toSetVariable: ProjectVariableSchema): Promise<setVariableResult | 'repository not found'> {
    const currentVariable = listVars.find(v => v.key === toSetVariable.key)
    if (currentVariable) {
      if (
        currentVariable.masked !== toSetVariable.masked
        || currentVariable.value !== toSetVariable.value
        || currentVariable.protected !== toSetVariable.protected
        || currentVariable.variable_type !== toSetVariable.variable_type
      ) {
        await this.api.ProjectVariables.edit(
          repoId,
          toSetVariable.key,
          toSetVariable.value,
          {
            variableType: toSetVariable.variable_type,
            masked: toSetVariable.masked,
            protected: toSetVariable.protected,
            filter: {
              environment_scope: toSetVariable.environment_scope,
            },
          },
        )
        return 'updated'
      }
      return 'already up-to-date'
    }
    await this.api.ProjectVariables.create(
      repoId,
      toSetVariable.key,
      toSetVariable.value,
      {
        variableType: toSetVariable.variable_type,
        masked: toSetVariable.masked,
        protected: toSetVariable.protected,
      },
    )
    return 'created'
  }

  // Mirror
  public async triggerMirror(targetRepo: string, syncAllBranches: boolean, branchName?: string) {
    if ((await this.getSpecialRepositories()).includes(targetRepo)) {
      throw new Error('User requested for invalid mirroring')
    }
    const repos = await this.listRepositories()
    const { mirror, target }: RepoSelect = repos.reduce((acc, repository) => {
      if (repository.name === 'mirror') {
        acc.mirror = repository
      }
      if (repository.name === targetRepo) {
        acc.target = repository
      }
      return acc
    }, {} as RepoSelect)
    if (!mirror) throw new Error('Unable to find mirror repository')
    if (!target) throw new Error('Unable to find target repository')
    return this.api.Pipelines.create(mirror.id, 'main', {
      variables: [
        {
          key: 'SYNC_ALL',
          value: syncAllBranches.toString(),
        },
        {
          key: 'GIT_BRANCH_DEPLOY',
          value: branchName ?? '',
        },
        {
          key: 'PROJECT_NAME',
          value: targetRepo,
        },
      ],
    })
  }
}
