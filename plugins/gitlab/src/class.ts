import { PluginApi, Project, RepoCreds } from '@cpn-console/hooks'
import { getApi, getConfig, getGroupRootId, infraAppsRepoName, internalMirrorRepoName } from './utils.js'
import { AccessTokenScopes, CommitAction, GroupSchema, GroupStatisticsSchema, MemberSchema, ProjectVariableSchema, RepositoryFileExpandedSchema, RepositoryTreeSchema, VariableSchema } from '@gitbeaker/rest'
import { getOrganizationId } from './group.js'
import { AccessLevel, Gitlab } from '@gitbeaker/core'
import { VaultProjectApi } from '@cpn-console/vault-plugin/types/class.js'
import { createHash } from 'node:crypto'

type setVariableResult = 'created' | 'updated' | 'already up-to-date'
type AccessLevelAllowed = AccessLevel.NO_ACCESS | AccessLevel.MINIMAL_ACCESS | AccessLevel.GUEST | AccessLevel.REPORTER | AccessLevel.DEVELOPER | AccessLevel.MAINTAINER | AccessLevel.OWNER
const infraGroupName = 'Infra'
const infraGroupPath = 'infra'

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

  // Group Infra
  public async getOrCreateInfraGroup (): Promise<GroupSchema> {
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

  public async getProjectId (projectName: string) {
    const pathProjectName = `${getConfig().projectsRootDir}/${this.project.organization.name}/${this.project.name}/${projectName}`
    const projects = (await this.api.Projects.search(projectName)).filter(p => p.path_with_namespace === pathProjectName)
    if (projects.length !== 1) {
      throw new Error('Gitlab project "' + pathProjectName + '" not found')
    }
    return projects[0].id
  }

  public async getProjectById (projectId: number) {
    return this.api.Projects.show(projectId)
  }

  public async getOrCreateInfraProject (zone: string) {
    const infraGroup = await this.getOrCreateInfraGroup()
    // Get or create projects_root_dir/infra/organization/zone
    const infraProjects = await this.api.Groups.allProjects(infraGroup.id)
    return infraProjects.find(repo => repo.name === zone) || await this.createEmptyRepository(
      zone,
      'Repository hosting deployment files for this zone of the parent organization.',
      infraGroup.id,
    )
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

  public async createEmptyRepository (repoName: string, description?: string | undefined, groupId?: number | undefined) {
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

  /**
   * Fonction pour commit un fichier dans un repo en mode "create or update"
   * @param repoId
   * @param content
   * @param filePath
   * @param branch
   */
  public async commitCreateOrUpdate (
    repoId: number,
    fileContent: string,
    filePath: string,
    branch: string = 'main',
    comment: string = 'ci: :robot_face: Update file content',
  ): Promise<boolean> {
    let filesTree: RepositoryTreeSchema[] | undefined
    let action: CommitAction['action'] | undefined
    let actualFile: RepositoryFileExpandedSchema | undefined

    const branches = await this.api.Branches.all(repoId)
    if (!branches.length) {
      action = 'create'
    } else {
      filesTree = await this.listFiles(repoId, '/', branch)
      console.log(filesTree)
    }
    if (filesTree?.find(f => f.path === filePath)) {
      actualFile = await this.api.RepositoryFiles.show(repoId, filePath, branch)
      const newContentDigest = createHash('sha256').update(fileContent).digest('hex')
      if (actualFile && actualFile.content_sha256 === newContentDigest) {
        console.log('Already up-to-date')
      } else {
        console.log('Update needed')
        action = 'update'
      }
    } else {
      console.log('File does not exist')
      action = 'create'
    }
    if (action) {
      const commitActions: CommitAction[] = [
        {
          action,
          filePath,
          content: fileContent,
        },
      ]
      await this.api.Commits.create(repoId, branch, comment, commitActions)
      return true
    }
    return false
  }

  /**
   * Fonction pour supprimer une liste de fichiers d'un repo
   * @param repoId
   * @param files
   * @param branch
   * @param comment
   */
  public async commitDelete (
    repoId: number,
    files: string[],
    branch: string = 'main',
    comment: string = 'ci: :robot_face: Delete files',
  ): Promise<boolean> {
    if (files.length) {
      const commitActions: CommitAction[] = files.map(filePath => {
        return {
          action: 'delete',
          filePath,
        }
      })
      console.log(commitActions)
      await this.api.Commits.create(repoId, branch, comment, commitActions)
      return true
    }
    return false
  }

  public async listFiles (repoId: number, path: string = '/', branch: string = 'main') {
    return this.api.Repositories.allRepositoryTrees(repoId, { path, ref: branch, recursive: true, perPage: 1000 })
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
