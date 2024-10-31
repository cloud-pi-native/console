import { createHash } from 'node:crypto'
import { PluginApi, type Project, type RepoCreds, type UniqueRepo } from '@cpn-console/hooks'
import type { AccessTokenScopes, CommitAction, GroupSchema, GroupStatisticsSchema, MemberSchema, ProjectVariableSchema, VariableSchema } from '@gitbeaker/rest'
import type { CondensedProjectSchema, Gitlab } from '@gitbeaker/core'
import { AccessLevel } from '@gitbeaker/core'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/class.js'
import { objectEntries } from '@cpn-console/shared'
import type { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { getOrganizationId } from './group.js'
import { getApi, getConfig, getGroupRootId, infraAppsRepoName, internalMirrorRepoName } from './utils.js'

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

export class GitlabProjectApi extends PluginApi {
  private api: Gitlab<false>
  private project: Project | UniqueRepo
  private gitlabGroup: GroupSchema & { statistics: GroupStatisticsSchema } | undefined
  private specialRepositories: string[] = [infraAppsRepoName, internalMirrorRepoName]
  private pendingCommits: PendingCommits = {}
  // private organizationGroup: GroupSchema & { statistics: GroupStatisticsSchema } | undefined

  constructor(project: Project | UniqueRepo) {
    super()
    this.project = project
    this.api = getApi()
  }

  // Group Project
  private async createProjectGroup(): Promise<GroupSchema> {
    const searchResult = await this.api.Groups.search(this.project.name)
    const parentId = await getOrganizationId(this.project.organization.name)
    const existingGroup = searchResult.find(group => group.parent_id === parentId && group.name === this.project.name)

    if (existingGroup) return existingGroup

    return this.api.Groups.create(this.project.name, this.project.name, {
      parentId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
    })
  }

  // Group Infra
  public async getOrCreateInfraGroup(): Promise<GroupSchema> {
    const rootId = await getGroupRootId()
    // Get or create projects_root_dir/infra group
    const searchResult = await this.api.Groups.search(infraGroupName)
    const existingParentGroup = searchResult.find(group => group.parent_id === rootId && group.name === infraGroupName)
    const infraParentGroup = existingParentGroup || await this.api.Groups.create(infraGroupName, infraGroupPath, {
      parentId: rootId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
      description: 'Group of all organization infrastructure groups.',
    })
    // Get or create projects_root_dir/infra/<organization> group
    const organizationName = this.project.organization.name
    const existingGroup = searchResult.find(group => group.parent_id === infraParentGroup.id && group.name === organizationName)
    if (existingGroup) return existingGroup
    return this.api.Groups.create(organizationName, organizationName, {
      parentId: infraParentGroup.id,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
      description: 'Group that hosts infrastructure-as-code repositories for all zones of this organization (ArgoCD pull targets).',
    })
  }

  public async getProjectGroup(): Promise<GroupSchema | undefined> {
    if (this.gitlabGroup) return this.gitlabGroup
    const parentId = await getOrganizationId(this.project.organization.name)
    const searchResult = await this.api.Groups.allSubgroups(parentId)
    this.gitlabGroup = searchResult.find(group => group.name === this.project.name)
    return this.gitlabGroup
  }

  public async getOrCreateProjectGroup(): Promise<GroupSchema> {
    const group = await this.getProjectGroup()
    if (group) return group
    return this.createProjectGroup()
  }

  // Tokens
  public async getProjectMirrorCreds(vaultApi: VaultProjectApi): Promise<GitlabMirrorSecret> {
    const tokenName = `${this.project.organization.name}-${this.project.name}-bot`
    const currentToken = await this.getProjectToken(tokenName)
    const creds: GitlabMirrorSecret = {
      MIRROR_USER: '',
      MIRROR_TOKEN: '',
    }
    if (currentToken) {
      const vaultSecret = await vaultApi.read('tech/GITLAB_MIRROR', { throwIfNoEntry: false }) as { data: GitlabMirrorSecret }
      if (vaultSecret) return vaultSecret.data
      await this.revokeProjectToken(currentToken.id)
    }
    const newToken = await this.createProjectToken(tokenName, ['write_repository', 'read_repository'])
    creds.MIRROR_TOKEN = newToken.token
    creds.MIRROR_USER = newToken.name
    await vaultApi.write(creds, 'tech/GITLAB_MIRROR')
    return creds
  }

  public async getProjectId(projectName: string) {
    const pathProjectName = `${getConfig().projectsRootDir}/${this.project.organization.name}/${this.project.name}/${projectName}`
    const project = (await this.api.Projects.search(projectName)).find(p => p.path_with_namespace === pathProjectName)

    if (!project) {
      throw new Error(`Gitlab project "${pathProjectName}" not found`)
    }
    return project.id
  }

  public async getProjectById(projectId: number) {
    return this.api.Projects.show(projectId)
  }

  public async getOrCreateInfraProject(zone: string) {
    const infraGroup = await this.getOrCreateInfraGroup()
    // Get or create projects_root_dir/infra/organization/zone
    const infraProjects = await this.api.Groups.allProjects(infraGroup.id)
    return infraProjects.find(repo => repo.name === zone) || await this.createEmptyRepository(
      zone,
      'Repository hosting deployment files for this zone of the parent organization.',
      infraGroup.id,
    )
  }

  public async getProjectToken(tokenName: string) {
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    const groupTokens = await this.api.GroupAccessTokens.all(group.id)
    return groupTokens.find(token => token.name === tokenName)
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
    const allTriggerTokens = await this.api.PipelineTriggerTokens.all(mirrorRepo.id)
    const currentTriggerToken = allTriggerTokens.find(token => token.description === tokenDescription)

    const tokenVaultSecret = await vaultApi.read('GITLAB', { throwIfNoEntry: false })

    if (currentTriggerToken && !tokenVaultSecret?.data?.GIT_MIRROR_TOKEN) {
      await this.api.PipelineTriggerTokens.remove(mirrorRepo.id, currentTriggerToken.id)
    }
    const triggerToken = await this.api.PipelineTriggerTokens.create(mirrorRepo.id, tokenDescription)
    return { token: triggerToken.token, repoId: mirrorRepo.id }
  }

  // Repositories
  public async getRepoUrl(repoName: string) {
    return `${getConfig().url}/${getConfig().projectsRootDir}/${this.project.organization.name}/${this.project.name}/${repoName}.git`
  }

  public async listRepositories() {
    const group = await this.getOrCreateProjectGroup()
    const projects = await this.api.Groups.allProjects(group.id, { simple: false }) // to refactor with https://github.com/jdalrymple/gitbeaker/pull/3624
    return Promise.all(projects.map(async (project) => {
      if (this.specialRepositories.includes(project.name) && (!project.topics || !project.topics.includes(pluginManagedTopic))) {
        return this.api.Projects.edit(project.id, { topics: project.topics ? [...project.topics, pluginManagedTopic] : [pluginManagedTopic] })
      }
      return project
    }))
  }

  public async createEmptyRepository(repoName: string, description?: string | undefined, groupId?: number | undefined) {
    const namespaceId = groupId || (await this.getOrCreateProjectGroup()).id
    const project = await this.api.Projects.create({
      name: repoName,
      path: repoName,
      namespaceId,
      description,
    })
    // Dépôt tout juste créé, zéro branche => pas d'erreur (filesTree undefined)
    await this.api.Commits.create(project.id, 'main', 'ci: 🌱 First commit', [])
    return project
  }

  public async createCloneRepository(repoName: string, externalRepoUrn: string, creds?: RepoCreds) {
    const group = await this.getOrCreateProjectGroup()
    const url = creds?.username || creds?.token
      ? `https://${creds?.username ?? ''}:${creds?.token ?? ''}@${externalRepoUrn}`
      : `https://${externalRepoUrn}`

    return this.api.Projects.create({
      namespaceId: group.id,
      name: repoName,
      path: repoName,
      ciConfigPath: '.gitlab-ci-dso.yml',
      importUrl: url,
    })
  }

  public async commitCreateOrUpdate(
    repoId: number,
    fileContent: string,
    filePath: string,
    branch: string = 'main',
    comment: string = 'ci: :robot_face: Update file content',
  ): Promise<boolean> {
    let action: CommitAction['action'] = 'create'

    const branches = await this.api.Branches.all(repoId)
    if (branches.some(b => b.name === branch)) {
      const filesTree = await this.listFiles(repoId, '/', branch)
      if (filesTree.find(f => f.path === filePath)) {
        const actualFile = await this.api.RepositoryFiles.show(repoId, filePath, branch)
        const newContentDigest = createHash('sha256').update(fileContent).digest('hex')
        if (!actualFile || actualFile.content_sha256 !== newContentDigest) {
          // Update needed
          action = 'update'
        } else {
          // Already up-to-date
          return false
        }
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

  public async listFiles(repoId: number, path: string = '/', branch: string = 'main') {
    try {
      const files = await this.api.Repositories.allRepositoryTrees(repoId, { path, ref: branch, recursive: true, perPage: 1000 })
      return files
    } catch (error) {
      const { cause } = error as GitbeakerRequestError
      if (cause?.description === '404 Tree Not Found') {
        // Empty repository, with zero commit ==> Zero files
        return []
      } else {
        throw error
      }
    }
  }

  public async deleteRepository(repoId: number) {
    return this.api.Projects.remove(repoId, { permanentlyRemove: true })
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
    return this.api.GroupMembers.all(group.id)
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
  public async setGitlabGroupVariable(toSetVariable: VariableSchema): Promise<setVariableResult> {
    const group = await this.getOrCreateProjectGroup()
    const listVars = await this.api.GroupVariables.all(group.id)
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
    } else {
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
  }

  public async setGitlabRepoVariable(repoName: string, toSetVariable: ProjectVariableSchema): Promise<setVariableResult | 'repository not found'> {
    const group = await this.getOrCreateProjectGroup()
    const allRepositories = await this.api.Groups.allProjects(group.id, { perPage: 1000 })
    const repository = allRepositories.find(({ name }) => name === repoName)
    if (!repository) return 'repository not found'

    const listVars = await this.api.ProjectVariables.all(repository.id)
    const currentVariable = listVars.find(v => v.key === toSetVariable.key)
    if (currentVariable) {
      if (
        currentVariable.masked !== toSetVariable.masked
        || currentVariable.value !== toSetVariable.value
        || currentVariable.protected !== toSetVariable.protected
        || currentVariable.variable_type !== toSetVariable.variable_type
      ) {
        await this.api.ProjectVariables.edit(
          repository.id,
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
    } else {
      await this.api.ProjectVariables.create(
        repository.id,
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
}
