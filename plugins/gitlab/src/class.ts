import { PluginApi, Project, RepoCreds } from '@cpn-console/hooks'
import { getApi, getConfig, infraAppsRepoName, internalMirrorRepoName } from './utils.js'
import { AccessTokenScopes, GroupSchema, GroupStatisticsSchema, MemberSchema, ProjectVariableSchema, VariableSchema } from '@gitbeaker/rest'
import { getOrganizationId } from './group.js'
import { AccessLevel, Gitlab } from '@gitbeaker/core'
import { VaultProjectApi } from '@cpn-console/vault-plugin/types/class.js'

type setVariableResult = 'created' | 'updated' | 'already up-to-date'
type AccessLevelAllowed = AccessLevel.NO_ACCESS | AccessLevel.MINIMAL_ACCESS | AccessLevel.GUEST | AccessLevel.REPORTER | AccessLevel.DEVELOPER | AccessLevel.MAINTAINER | AccessLevel.OWNER

type GitlabMirrorSecret = {
  MIRROR_USER: string,
  MIRROR_TOKEN: string,
}

export class GitlabProjectApi extends PluginApi {
  private api: Gitlab<false>
  private project: Project
  private gitlabGroup: GroupSchema & { statistics: GroupStatisticsSchema } | undefined
  private specialRepositories: string[] = [infraAppsRepoName, internalMirrorRepoName]
  // private organizationGroup: GroupSchema & { statistics: GroupStatisticsSchema } | undefined

  constructor (project: Project) {
    super()
    this.project = project
    this.api = getApi()
  }

  // Group Project
  private async createProjectGroup (): Promise<GroupSchema> {
    const searchResult = await this.api.Groups.search(this.project.name)
    const parentId = await getOrganizationId(this.project.organization.name)
    const existingGroup = searchResult.find(group => group.parent_id === parentId && group.name === this.project.name)

    if (existingGroup) return existingGroup

    return this.api.Groups.create(this.project.name, this.project.name, {
      parentId,
      projectCreationLevel: 'maintainer',
      subgroupCreationLevel: 'owner',
      defaultBranchProtection: 0,
      description: this.project.description ?? '',
    })
  }

  public async getProjectGroup (): Promise<GroupSchema | undefined> {
    if (this.gitlabGroup) return this.gitlabGroup
    const parentId = await getOrganizationId(this.project.organization.name)
    const searchResult = await this.api.Groups.allSubgroups(parentId)
    this.gitlabGroup = searchResult.find(group => group.name === this.project.name)
    return this.gitlabGroup
  }

  public async getOrCreateProjectGroup (): Promise<GroupSchema> {
    const group = await this.getProjectGroup()
    if (group) return group
    return this.createProjectGroup()
  }

  // Tokens
  public async getProjectMirrorCreds (vaultApi: VaultProjectApi): Promise<GitlabMirrorSecret> {
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

  public async getProjectToken (tokenName: string) {
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    const groupTokens = await this.api.GroupAccessTokens.all(group.id)
    return groupTokens.find(token => token.name === tokenName)
  }

  public async createProjectToken (tokenName: string, scopes: AccessTokenScopes[]) {
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    return this.api.GroupAccessTokens.create(group.id, tokenName, scopes, expiryDate.toLocaleDateString('en-CA'))
  }

  public async revokeProjectToken (tokenId: number) {
    const group = await this.getProjectGroup()
    if (!group) throw new Error('Unable to retrieve gitlab project group')
    return this.api.GroupAccessTokens.revoke(group.id, tokenId)
  }

  // Triggers
  public async getMirrorProjectTriggerToken (vaultApi: VaultProjectApi) {
    const tokenDescription = 'mirroring-from-external-repo'
    const gitlabRepositories = await this.listRepositories()
    const mirrorRepo = gitlabRepositories.find(repo => repo.name === internalMirrorRepoName)
    if (!mirrorRepo) throw new Error('Don\'t know how mirror repo could not exist')
    const allTriggerTokens = await this.api.PipelineTriggerTokens.all(mirrorRepo.id)
    const currentTriggerToken = allTriggerTokens.find(token => token.description === tokenDescription)

    const tokenVaultSecret = await vaultApi.read('GITLAB', { throwIfNoEntry: false })

    if (currentTriggerToken && !tokenVaultSecret?.data?.GIT_MIRROR_TOKEN) {
      console.debug('GITLAB: recreating PipelineTriggerToken')
      await this.api.PipelineTriggerTokens.remove(mirrorRepo.id, currentTriggerToken.id)
    }
    const triggerToken = await this.api.PipelineTriggerTokens.create(mirrorRepo.id, tokenDescription)
    return { token: triggerToken.token, repoId: mirrorRepo.id }
  }

  // Repositories
  public async getRepoUrl (repoName: string) {
    return `${getConfig().url}/${getConfig().projectsRootDir}/${this.project.organization.name}/${this.project.name}/${repoName}.git`
  }

  public async listRepositories () {
    const group = await this.getOrCreateProjectGroup()
    return this.api.Groups.allProjects(group.id)
  }

  public async createEmptyRepository (repoName: string) {
    const group = await this.getOrCreateProjectGroup()
    return this.api.Projects.create({
      name: repoName,
      path: repoName,
      namespaceId: group.id,
    })
  }

  public async createCloneRepository (repoName: string, externalRepoUrn: string, creds?: RepoCreds) {
    const group = await this.getOrCreateProjectGroup()
    const url = creds
      ? `https://${creds.username ?? ''}:${creds.token ?? ''}@${externalRepoUrn}`
      : `https://${externalRepoUrn}`

    return this.api.Projects.create({
      namespaceId: group.id,
      name: repoName,
      path: repoName,
      ciConfigPath: '.gitlab-ci-dso.yml',
      importUrl: url,
    })
  }

  public async deleteRepository (repoId: number) {
    return this.api.Projects.remove(repoId, { permanentlyRemove: true })
  }

  // Special Repositories
  public async getSpecialRepositories (): Promise<string[]> {
    return this.specialRepositories
  }

  public async addSpecialRepositories (name: string) {
    if (!this.specialRepositories.includes(name)) this.specialRepositories.push(name)
  }

  // Group members
  public async getGroupMembers () {
    const group = await this.getOrCreateProjectGroup()
    return this.api.GroupMembers.all(group.id)
  }

  public async addGroupMember (userId: number, accessLevel: AccessLevelAllowed = AccessLevel.DEVELOPER): Promise<MemberSchema> {
    const group = await this.getOrCreateProjectGroup()
    return this.api.GroupMembers.add(group.id, userId, accessLevel)
  }

  public async removeGroupMember (userId: number) {
    const group = await this.getOrCreateProjectGroup()
    return this.api.GroupMembers.remove(group.id, userId)
  }

  // CI Variables
  public async setGitlabGroupVariable (toSetVariable: VariableSchema): Promise<setVariableResult> {
    const group = await this.getOrCreateProjectGroup()
    const listVars = await this.api.GroupVariables.all(group.id)
    const currentVariable = listVars.find(v => v.key === toSetVariable.key)
    if (!currentVariable) {
      await this.api.GroupVariables.create(
        group.id,
        toSetVariable.key,
        toSetVariable.value,
        {
          variableType: toSetVariable.variable_type,
          masked: toSetVariable.masked,
          protected: toSetVariable.protected,

        })
      return 'created'
    } else {
      if (
        currentVariable.masked !== toSetVariable.masked ||
      currentVariable.value !== toSetVariable.value ||
      currentVariable.protected !== toSetVariable.protected ||
      currentVariable.variable_type !== toSetVariable.variable_type
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
          })
        return 'updated'
      }
      return 'already up-to-date'
    }
  }

  public async setGitlabRepoVariable (repoName: string, toSetVariable: ProjectVariableSchema): Promise<setVariableResult | 'repository not found'> {
    const group = await this.getOrCreateProjectGroup()
    const allRepositories = await this.api.Groups.allProjects(group.id, { perPage: 1000 })
    const repository = allRepositories.find(({ name }) => name === repoName)
    if (!repository) return 'repository not found'

    const listVars = await this.api.ProjectVariables.all(repository.id)
    const currentVariable = listVars.find(v => v.key === toSetVariable.key)
    if (currentVariable) {
      if (
        currentVariable.masked !== toSetVariable.masked ||
      currentVariable.value !== toSetVariable.value ||
      currentVariable.protected !== toSetVariable.protected ||
      currentVariable.variable_type !== toSetVariable.variable_type
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
          })
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
        })
      return 'created'
    }
  }
}
