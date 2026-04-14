import type { Project, ProjectMember, UniqueRepo } from '@cpn-console/hooks'
import type { CommitAction, CondensedProjectSchema, GitlabClient, GroupSchema, MemberSchema, ProjectSchema, VariableSchema } from '@cpn-console/miracle'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/vault-project-api.js'
import { createHash } from 'node:crypto'
import { PluginApi } from '@cpn-console/hooks'
import { AccessLevel, GitlabHttpError } from '@cpn-console/miracle'
import { objectEntries } from '@cpn-console/shared'
import config from './config.js'
import {
  customAttributesFilter,
  infraGroupCustomAttributeKey,
  managedByConsoleCustomAttributeKey,
  projectGroupCustomAttributeKey,
  upsertCustomAttribute,
} from './custom-attributes.js'
import { logger } from './logger.js'
import {
  find,
  getAll,
  getClient,
  getGroupRootId,
  infraAppsRepoName,
  internalMirrorRepoName,
  MAX_PAGINATION_PER_PAGE,
  offsetPaginate,
} from './utils.js'

type SetVariableResult = 'created' | 'updated' | 'already up-to-date'
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
  branches: Record<string, { messages: string[], actions: CommitAction[] }>
}>

interface CreateEmptyRepositoryArgs {
  repoName: string
  description?: string
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export class GitlabApi extends PluginApi {
  protected api: GitlabClient
  private pendingCommits: PendingCommits = {}

  constructor() {
    super()
    this.api = getClient() as unknown as GitlabClient
  }

  public async createEmptyRepository({ createFirstCommit, groupId, repoName, description, ciConfigPath }: CreateEmptyRepositoryArgs & {
    createFirstCommit: boolean
    groupId: number
    ciConfigPath?: string
  }) {
    logger.debug({ action: 'createEmptyRepository', repoName, groupId, createFirstCommit, ciConfigPath }, 'Create empty repository')
    const project = await this.api.projectsCreate({
      name: repoName,
      path: repoName,
      ciConfigPath,
      namespaceId: groupId,
      description,
    })
    try {
      await upsertCustomAttribute('projects', project.id, managedByConsoleCustomAttributeKey, 'true')
    } catch (err) {
      logger.debug({ action: 'createEmptyRepository', projectId: project.id, err }, 'Failed to upsert project custom attribute')
    }
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
    logger.debug({ action: 'commitCreateOrUpdate', repoId, filePath, branch }, 'Schedule commit create/update')
    let action: CommitAction['action'] = 'create'

    const existingBranch = await find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.branchesAll(repoId, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }),
      (b: { name: string }) => b.name === branch,
    )
    if (existingBranch) {
      let actualFile: { content_sha256?: string } | undefined
      try {
        actualFile = await this.api.repositoryFilesShow(repoId, filePath, branch)
      } catch {}
      if (actualFile) {
        const newContentDigest = createHash('sha256').update(fileContent).digest('hex')
        if (actualFile.content_sha256 === newContentDigest) {
          return false
        }
        action = 'update'
      }
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
    logger.debug({ action: 'commitDelete', repoId, branch, filesCount: files.length }, 'Schedule commit delete')
    if (files.length) {
      const commitActions: CommitAction[] = files.map((filePath) => {
        return {
          action: 'delete',
          file_path: filePath,
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
          logger.debug({ action: 'commitFiles', repoId: id, branch, filesNumber }, 'Commit pending file changes')
          await this.api.commitsCreate(id, branch, message, details.actions)
        }
      }
    }
    return filesUpdated
  }

  public async listFiles(repoId: number, options: { path?: string, ref?: string, recursive?: boolean } = {}) {
    const path = options.path ?? '/'
    const ref = options.ref ?? 'main'
    const recursive = options.recursive ?? false
    try {
      return await getAll(offsetPaginate(
        (opts: { page: number, perPage?: number }) => this.api.repositoriesAllRepositoryTrees(repoId, { path, ref, recursive }, opts.page, opts.perPage),
        { perPage: MAX_PAGINATION_PER_PAGE },
      ))
    } catch (error) {
      if (error instanceof GitlabHttpError && error.status === 404) {
        return []
      }
      throw error
    }
  }

  public async deleteRepository(repoId: number, fullPath: string): Promise<unknown> {
    logger.info({ action: 'deleteRepository', repoId, fullPath }, 'Delete repository')
    await this.api.projectsRemove(repoId)
    return this.api.projectsRemove(repoId, { permanentlyRemove: true, fullPath: `${fullPath}-deletion_scheduled-${repoId}` })
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
    logger.debug({ action: 'getOrCreateInfraGroup', infraGroupName }, 'Get/create infra group')
    const rootId = await getGroupRootId()
    const fast = await find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupsAll({
        ...customAttributesFilter(infraGroupCustomAttributeKey, 'true'),
      }, opts.page, opts.perPage)),
      (group: GroupSchema) => group.parent_id === rootId,
    )

    const existingParentGroup = fast ?? await find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupsAll({
        search: infraGroupName,
      }, opts.page, opts.perPage)),
      (group: GroupSchema) => group.parent_id === rootId && group.name === infraGroupName,
    )

    const group = existingParentGroup || await this.api.groupsCreate(infraGroupName, infraGroupPath, {
      parentId: rootId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
      description: 'Group that hosts infrastructure-as-code repositories for all zones (ArgoCD pull targets).',
    })
    try {
      await upsertCustomAttribute('groups', group.id, infraGroupCustomAttributeKey, 'true')
      await upsertCustomAttribute('groups', group.id, managedByConsoleCustomAttributeKey, 'true')
    } catch (err) {
      logger.debug({ action: 'getOrCreateInfraGroup', groupId: group.id, err }, 'Failed to upsert infra group custom attribute')
    }
    return group
  }

  public async getOrCreateInfraProject(zone: string): Promise<ProjectSchema> {
    logger.debug({ action: 'getOrCreateInfraProject', zone }, 'Get/create infra project for zone')
    if (this.infraProjectsByZoneSlug.has(zone)) {
      return this.infraProjectsByZoneSlug.get(zone)!
    }
    const infraGroup = await this.getOrCreateInfraGroup()
    const fast = await find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupsAllProjects(infraGroup.id, {
        ...customAttributesFilter(managedByConsoleCustomAttributeKey, 'true'),
        search: zone,
        simple: true,
      }, opts.page, opts.perPage)),
      (repo: CondensedProjectSchema) => repo.name === zone,
    )
    const project = fast ?? await find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupsAllProjects(infraGroup.id, {
        search: zone,
        simple: true,
      }, opts.page, opts.perPage)),
      (repo: CondensedProjectSchema) => repo.name === zone,
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
  private project: Project | UniqueRepo | ProjectMember['project']
  private gitlabGroup: GroupSchema | undefined
  private specialRepositories: string[] = [infraAppsRepoName, internalMirrorRepoName]
  private zoneApi: GitlabZoneApi

  constructor(project: Project | UniqueRepo | ProjectMember['project']) {
    super()
    this.project = project
    this.zoneApi = new GitlabZoneApi()
  }

  private async createProjectGroup(): Promise<GroupSchema> {
    logger.info({ action: 'createProjectGroup', projectSlug: this.project.slug }, 'Create project group')
    const parentId = await getGroupRootId()
    const existingGroup = await find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupsAll({
        search: this.project.slug,
      }, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }),
      (group: GroupSchema) => group.parent_id === parentId && group.name === this.project.slug,
    )

    if (existingGroup) return existingGroup

    const group = await this.api.groupsCreate(this.project.slug, this.project.slug, {
      parentId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
    })
    try {
      await upsertCustomAttribute('groups', group.id, projectGroupCustomAttributeKey, this.project.slug)
      await upsertCustomAttribute('groups', group.id, managedByConsoleCustomAttributeKey, 'true')
    } catch (err) {
      logger.debug({ action: 'createProjectGroup', groupId: group.id, err }, 'Failed to upsert project group custom attribute')
    }
    return group
  }

  public async getProjectGroup(): Promise<GroupSchema | undefined> {
    logger.debug({ action: 'getProjectGroup', projectSlug: this.project.slug }, 'Get project group')
    if (!this.gitlabGroup) {
      logger.debug({ action: 'getProjectGroup', projectSlug: this.project.slug }, 'Search project group')
      const parentId = await getGroupRootId()
      const fast = await find(
        offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupsAllSubgroups(parentId, {
          ...customAttributesFilter(projectGroupCustomAttributeKey, this.project.slug),
        }, opts.page, opts.perPage)),
        (group: GroupSchema) => group.name === this.project.slug,
      )

      this.gitlabGroup = fast ?? await find(
        offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupsAllSubgroups(parentId, {
          search: this.project.slug,
        }, opts.page, opts.perPage)),
        (group: GroupSchema) => group.name === this.project.slug,
      )

      if (this.gitlabGroup) {
        try {
          await upsertCustomAttribute('groups', this.gitlabGroup.id, projectGroupCustomAttributeKey, this.project.slug)
          await upsertCustomAttribute('groups', this.gitlabGroup.id, managedByConsoleCustomAttributeKey, 'true')
        } catch (err) {
          logger.debug({ action: 'getProjectGroup', groupId: this.gitlabGroup.id, err }, 'Failed to upsert project group custom attribute')
        }
      }
    }
    return this.gitlabGroup
  }

  public async getOrCreateProjectGroup(): Promise<GroupSchema> {
    logger.debug({ action: 'getOrCreateProjectGroup', projectSlug: this.project.slug }, 'Get/create project group')
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
    logger.debug({ action: 'getProjectMirrorCreds', projectSlug: this.project.slug }, 'Get/create project mirror credentials')
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

          await this.api.validateTokenForGroup(group.id, vaultSecret.data.MIRROR_TOKEN)
          if (vaultSecret.data.MIRROR_TOKEN) {
            return vaultSecret.data // valid token hence early exit
          }
        } catch (error) {
          logger.warn({ action: 'getProjectMirrorCreds', err: error }, 'Mirror token invalid, revoking project token')
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
    logger.debug({ action: 'getProjectId', projectName, projectSlug: this.project.slug }, 'Look up project id')
    const projectGroup = await this.getProjectGroup()
    if (!projectGroup) throw new Error(`Gitlab inaccessible, impossible de trouver le groupe ${this.project.slug}`)

    const fast = await find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupsAllProjects(projectGroup.id, {
        ...customAttributesFilter(managedByConsoleCustomAttributeKey, 'true'),
        search: projectName,
        simple: true,
      }, opts.page, opts.perPage)),
      (repo: CondensedProjectSchema) => repo.name === projectName,
    )

    const project = fast ?? await find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupsAllProjects(projectGroup.id, {
        search: projectName,
        simple: true,
      }, opts.page, opts.perPage)),
      (repo: CondensedProjectSchema) => repo.name === projectName,
    )

    return project?.id
  }

  public async getProjectById(projectId: number) {
    return this.api.projectsShow(projectId)
  }

  public async getOrCreateInfraProject(zone: string) {
    return await this.zoneApi.getOrCreateInfraProject(zone)
  }

  public async getProjectToken(tokenName: string) {
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupAccessTokensAll(group.id, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }),
      (token: { name: string }) => token.name === tokenName,
    )
  }

  public async createProjectToken(tokenName: string, scopes: string[]) {
    logger.info({ action: 'createProjectToken', tokenName, projectSlug: this.project.slug }, 'Create project access token')
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    return this.api.groupAccessTokensCreate(group.id, tokenName, scopes, isoDate(expiryDate))
  }

  public async revokeProjectToken(tokenId: number) {
    logger.info({ action: 'revokeProjectToken', tokenId, projectSlug: this.project.slug }, 'Revoke project access token')
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return this.api.groupAccessTokensRevoke(group.id, tokenId)
  }

  public async getMirrorProjectTriggerToken(vaultApi: VaultProjectApi) {
    logger.debug({ action: 'getMirrorProjectTriggerToken', projectSlug: this.project.slug }, 'Get mirror project trigger token')
    const tokenDescription = 'mirroring-from-external-repo'
    const gitlabRepositories = await this.listRepositories()
    const mirrorRepo = gitlabRepositories.find((repo: CondensedProjectSchema) => repo.name === internalMirrorRepoName)
    if (!mirrorRepo) throw new Error('Don\'t know how mirror repo could not exist')
    const currentTriggerToken = await find(
      offsetPaginate((opts: { page: number, perPage?: number }) => this.api.pipelineTriggerTokensAll(mirrorRepo.id, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }),
      (token: { description: string }) => token.description === tokenDescription,
    )

    const tokenVaultSecret = await vaultApi.read('GITLAB', { throwIfNoEntry: false })

    if (currentTriggerToken && !tokenVaultSecret?.data?.GIT_MIRROR_TOKEN) {
      await this.api.pipelineTriggerTokensRemove(mirrorRepo.id, currentTriggerToken.id)
    }
    const triggerToken = await this.api.pipelineTriggerTokensCreate(mirrorRepo.id, tokenDescription)
    return { token: triggerToken.token, repoId: mirrorRepo.id }
  }

  public async getPublicRepoUrl(repoName: string) {
    return `${await this.getPublicGroupUrl()}/${repoName}.git`
  }

  public async getInternalRepoUrl(repoName: string) {
    return `${await this.getInternalGroupUrl()}/${repoName}.git`
  }

  public async listRepositories() {
    const group = await this.getOrCreateProjectGroup()
    const projects = await getAll(offsetPaginate(
      (opts: { page: number, perPage?: number }) => this.api.groupsAllProjects(group.id, { simple: false }, opts.page, opts.perPage),
      { perPage: MAX_PAGINATION_PER_PAGE },
    ))
    return Promise.all(projects.map(async (project: CondensedProjectSchema) => {
      if (this.specialRepositories.includes(project.name) && (!project.topics || !project.topics.includes(pluginManagedTopic))) {
        return this.api.projectsEdit(project.id, { topics: project.topics ? [...project.topics, pluginManagedTopic] : [pluginManagedTopic] })
      }
      return project
    }))
  }

  public async createEmptyProjectRepository({ repoName, description, clone }: CreateEmptyRepositoryArgs & { clone?: boolean }) {
    logger.info({ action: 'createEmptyProjectRepository', repoName, projectSlug: this.project.slug, clone }, 'Create empty project repository')
    const namespaceId = (await this.getOrCreateProjectGroup()).id
    return this.createEmptyRepository({
      repoName,
      groupId: namespaceId,
      description,
      ciConfigPath: clone ? '.gitlab-ci-dso.yml' : undefined,
      createFirstCommit: !clone,
    })
  }

  public async getSpecialRepositories(): Promise<string[]> {
    return this.specialRepositories
  }

  public async addSpecialRepositories(name: string) {
    logger.debug({ action: 'addSpecialRepositories', name, projectSlug: this.project.slug }, 'Register special repository')
    if (!this.specialRepositories.includes(name)) {
      this.specialRepositories.push(name)
    }
  }

  public async getGroupMembers() {
    const group = await this.getOrCreateProjectGroup()
    return getAll(offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupMembersAll(group.id, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }))
  }

  public async addGroupMember(userId: number, accessLevel: AccessLevelAllowed = AccessLevel.DEVELOPER): Promise<MemberSchema> {
    logger.info({ action: 'addGroupMember', accessLevel, projectSlug: this.project.slug }, 'Add group member')
    const group = await this.getOrCreateProjectGroup()
    return this.api.groupMembersAdd(group.id, userId, accessLevel)
  }

  public async editGroupMember(userId: number, accessLevel: AccessLevelAllowed = AccessLevel.DEVELOPER): Promise<MemberSchema> {
    logger.info({ action: 'editGroupMember', accessLevel, projectSlug: this.project.slug }, 'Edit group member')
    const group = await this.getOrCreateProjectGroup()
    return this.api.groupMembersEdit(group.id, userId, accessLevel)
  }

  public async removeGroupMember(userId: number) {
    logger.info({ action: 'removeGroupMember', projectSlug: this.project.slug }, 'Remove group member')
    const group = await this.getOrCreateProjectGroup()
    return this.api.groupMembersRemove(group.id, userId)
  }

  public async getGitlabGroupVariables(): Promise<VariableSchema[]> {
    const group = await this.getOrCreateProjectGroup()
    return await getAll(offsetPaginate((opts: { page: number, perPage?: number }) => this.api.groupVariablesAll(group.id, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }))
  }

  public async setGitlabGroupVariable(listVars: VariableSchema[], toSetVariable: VariableSchema): Promise<SetVariableResult> {
    const group = await this.getOrCreateProjectGroup()
    const currentVariable = listVars.find(v => v.key === toSetVariable.key)
    if (currentVariable) {
      if (
        currentVariable.masked !== toSetVariable.masked
        || currentVariable.value !== toSetVariable.value
        || currentVariable.protected !== toSetVariable.protected
        || currentVariable.variable_type !== toSetVariable.variable_type
      ) {
        await this.api.groupVariablesEdit(
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
    await this.api.groupVariablesCreate(
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
    return await getAll(offsetPaginate((opts: { page: number, perPage?: number }) => this.api.projectVariablesAll(repoId, opts.page, opts.perPage), { perPage: MAX_PAGINATION_PER_PAGE }))
  }

  public async setGitlabRepoVariable(repoId: number, listVars: VariableSchema[], toSetVariable: VariableSchema & { environment_scope: string }): Promise<SetVariableResult | 'repository not found'> {
    const currentVariable = listVars.find(v => v.key === toSetVariable.key)
    if (currentVariable) {
      if (
        currentVariable.masked !== toSetVariable.masked
        || currentVariable.value !== toSetVariable.value
        || currentVariable.protected !== toSetVariable.protected
        || currentVariable.variable_type !== toSetVariable.variable_type
      ) {
        await this.api.projectVariablesEdit(
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
    await this.api.projectVariablesCreate(
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

  public async triggerMirror(targetRepo: string, syncAllBranches: boolean, branchName?: string) {
    logger.info({ action: 'triggerMirror', targetRepo, syncAllBranches, branchName, projectSlug: this.project.slug }, 'Trigger repository mirror')
    if ((await this.getSpecialRepositories()).includes(targetRepo)) {
      throw new Error('User requested for invalid mirroring')
    }
    const repos = await this.listRepositories()
    const { mirror, target }: RepoSelect = repos.reduce((acc: RepoSelect, repository: CondensedProjectSchema) => {
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
    return this.api.pipelinesCreate(mirror.id, 'main', [
      { key: 'SYNC_ALL', value: syncAllBranches.toString() },
      { key: 'GIT_BRANCH_DEPLOY', value: branchName ?? '' },
      { key: 'PROJECT_NAME', value: targetRepo },
    ])
  }
}
