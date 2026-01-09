import type { AccessTokenScopes, GroupSchema, GroupStatisticsSchema, MemberSchema, ProjectVariableSchema, VariableSchema } from '@gitbeaker/rest'
import { AccessLevel } from '@gitbeaker/core'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/vault-project-api.js'
import { getApi, getGroupRootId, infraAppsRepoName, internalMirrorRepoName } from './utils.js'
import config from './config.js'
import { type CreateEmptyRepositoryArgs, GitlabApi, type GitlabMirrorSecret, type RepoSelect } from './gitlab-api.js'
import type { Project, UniqueRepo } from '@cpn-console/hooks'
import { GitlabZoneApi } from './gitlab-zone-api.js'

type setVariableResult = 'created' | 'updated' | 'already up-to-date'
type AccessLevelAllowed = AccessLevel.NO_ACCESS | AccessLevel.MINIMAL_ACCESS | AccessLevel.GUEST | AccessLevel.REPORTER | AccessLevel.DEVELOPER | AccessLevel.MAINTAINER | AccessLevel.OWNER
export const pluginManagedTopic = 'plugin-managed'

/** Class providing project-specific functions to interact with Gitlab API */
export class GitlabProjectApi extends GitlabApi {
  private project: Project | UniqueRepo
  private gitlabGroup: GroupSchema & { statistics: GroupStatisticsSchema } | undefined
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
    const searchResult = await this.api.Groups.search(this.project.slug)
    const parentId = await getGroupRootId()
    const existingGroup = searchResult.find(group => group.parent_id === parentId && group.name === this.project.slug)

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
    const searchResult = await this.api.Groups.allSubgroups(parentId)
    this.gitlabGroup = searchResult.find(group => group.name === this.project.slug)
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
    if (!projectGroup) {
      throw new Error('Parent DSO Project group has not been created yet')
    }
    const projectsInGroup = await this.api.Groups.allProjects(projectGroup.id, {
      search: projectName,
      simple: true,
      perPage: 100,
    })
    const project = projectsInGroup.find(p => p.path === projectName)

    if (!project) {
      const pathProjectName = `${config().projectsRootDir}/${this.project.slug}/${projectName}`
      throw new Error(`Gitlab project "${pathProjectName}" not found`)
    }
    return project.id
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
  public async getPublicRepoUrl(repoName: string) {
    return `${await this.getPublicGroupUrl()}/${repoName}.git`
  }

  public async getInternalRepoUrl(repoName: string) {
    return `${await this.getInternalGroupUrl()}/${repoName}.git`
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

  public async createEmptyProjectRepository({ repoName, description, clone }: CreateEmptyRepositoryArgs & { clone?: boolean }) {
    const namespaceId = (await this.getOrCreateProjectGroup()).id
    return this.createEmptyRepository({
      repoName,
      groupId: namespaceId,
      description,
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
  public async getGitlabGroupVariables(): Promise<VariableSchema[]> {
    const group = await this.getOrCreateProjectGroup()
    return await this.api.GroupVariables.all(group.id)
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
    return await this.api.ProjectVariables.all(repoId)
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
