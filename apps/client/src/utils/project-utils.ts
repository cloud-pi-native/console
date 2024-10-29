import {
  PROJECT_PERMS,
  getPermsByUserRoles,
  objectKeys,
  resourceListToDict,
} from '@cpn-console/shared'
import type {
  CreateEnvironmentBody,
  CreateRepositoryBody,
  Environment,
  Organization,
  PermissionTarget,
  PluginsUpdateBody,
  ProjectService,
  ProjectV2,
  Repo,
  RepositoryParams,
  Role,
  UpdateEnvironmentBody,
  UpdateRepositoryBody,
  User,
  projectContract,
  projectMemberContract,
  projectRoleContract,
} from '@cpn-console/shared'

// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import {
  apiClient,
  extractData,
} from '@/api/xhr-client.js'
import { useUserStore } from '@/stores/user.js'
import { useLogStore } from '@/stores/log.js'

export type ProjectOperations = 'create'
  | 'delete'
  | 'envManagement'
  | 'repoManagement'
  | 'teamManagement'
  | 'searchSecret'
  | 'replay'
  | 'update'
  | 'lockHandling'
  | 'saveServices'

function calculateProjectPerms(project: ProjectV2 | undefined, userId: string | undefined) {
  if (!project || !userId) return 0n
  if (userId === project?.ownerId) return PROJECT_PERMS.MANAGE
  const selfMember = project.members.find(member => member.userId === userId)
  if (!selfMember) return 0n

  return getPermsByUserRoles(selfMember.roleIds, resourceListToDict(project.roles), project.everyonePerms)
}

export class Project implements ProjectV2 {
  id: string
  clusterIds: string[]
  description: string | undefined
  everyonePerms: string
  name: string
  locked: boolean
  owner: { id: string, updatedAt: string, createdAt: string, firstName: string, lastName: string, email: string }
  ownerId: string
  roles: { id: string, name: string, permissions: string, position: number }[]
  organizationId: string
  organization: { id: string, updatedAt: string, createdAt: string, name: string, active: boolean, label: string, source: string }
  members: ({ userId: string, firstName: string, lastName: string, email: string, roleIds: string[] } | { updatedAt: string, createdAt: string, firstName: string, lastName: string, email: string, userId: string, roleIds: string[] })[]
  createdAt: string
  updatedAt: string
  status: ProjectV2['status']
  operationsInProgress = new Set<ProjectOperations>()
  myPerms: bigint
  repositories: Repo[] | undefined = undefined
  environments: Environment[] | undefined = undefined
  services: ProjectService[] = []

  constructor(project: ProjectV2, organization: Organization) {
    this.id = project.id
    this.clusterIds = project.clusterIds
    this.description = project.description
    this.everyonePerms = project.everyonePerms
    this.name = project.name
    this.locked = project.locked
    this.owner = project.owner
    this.ownerId = project.ownerId
    this.roles = project.roles
    this.organizationId = project.organizationId
    this.organization = organization
    this.members = project.members
    this.createdAt = project.createdAt
    this.updatedAt = project.updatedAt
    this.status = project.status
    this.myPerms = calculateProjectPerms(this, useUserStore().userProfile?.id)
  }

  private removeOperation(operationName: ProjectOperations) {
    setTimeout(() => {
      useLogStore().needRefresh = true
    }, 100)
    return this.operationsInProgress.delete(operationName)
  }

  private addOperation(operationName: ProjectOperations): () => void {
    if (this.operationsInProgress.has(operationName)) {
      operationName += getRandomId()
    }
    if (this.operationsInProgress.size <= 1) {
      this.operationsInProgress.add(operationName)
    } else {
      return () => {}
    }
    return () => { this.removeOperation(operationName) }
  }

  private computePerms() {
    this.myPerms = calculateProjectPerms(this, useUserStore().userProfile?.id)
  }

  updateData(project: Partial<ProjectV2 & { organization: Organization }>) {
    for (const key of objectKeys(project)) {
      // @ts-ignore
      this[key] = project[key]
    }
    this.computePerms()
    return this
  }

  async update(data: typeof projectContract.updateProject.body._type) {
    const callback = this.addOperation('update')
    try {
      const project = await apiClient.Projects.updateProject({ body: data, params: { projectId: this.id } })
        .then(response => extractData(response, 200))
        .finally(() => callback())
      return this.updateData(project)
    } finally {
      callback()
    }
  }

  async refresh() {
    const project = await apiClient.Projects.getProject({ params: { projectId: this.id } })
      .then(response => extractData(response, 200))
    this.updateData(project)
    await Promise.all([
      this.Repositories.list(),
      this.Environments.list(),
    ])
    return this
  }

  async delete() {
    const callback = this.addOperation('delete')
    try {
      await apiClient.Projects.archiveProject({ params: { projectId: this.id } })
        .then(response => extractData(response, 204))
      this.status = 'archived'
    } catch {
      await this.refresh()
    } finally {
      callback()
    }
  }

  async replay() {
    const callback = this.addOperation('update')
    try {
      await apiClient.Projects.replayHooksForProject({ params: { projectId: this.id } })
        .then(response => extractData(response, 204))
      return this.refresh()
    } finally {
      callback()
    }
  }

  Members = {
    list: async () => {
      this.members = await apiClient.ProjectsMembers.listMembers({ params: { projectId: this.id } })
        .then(response => extractData(response, 200))
      return this.members
    },
    create: async (email: string) => {
      const callback = this.addOperation('teamManagement')
      try {
        this.members = await apiClient.ProjectsMembers.addMember({ params: { projectId: this.id }, body: { email } })
          .then(response => extractData(response, 201))
        return this.members
      } finally { callback() }
    },
    delete: async (userId: User['id']) => {
      const callback = this.addOperation('teamManagement')
      try {
        await apiClient.ProjectsMembers.removeMember({ params: { projectId: this.id, userId } })
          .then(response => extractData(response, 200))
        return this.Members.list()
      } finally { callback() }
    },
    patch: async (body: typeof projectMemberContract.patchMembers.body._type) => {
      const callback = this.addOperation('teamManagement')
      try {
        this.members = await apiClient.ProjectsMembers.patchMembers({ params: { projectId: this.id }, body })
          .then(response => extractData(response, 200))
        return this.members
      } finally { callback() }
    },
    getCandidateUsers: async (letters: string) => {
      return apiClient.Users.getMatchingUsers({ query: { letters, notInProjectId: this.id } })
        .then(response => extractData(response, 200))
    },
  }

  Environments = {
    list: async () => {
      this.environments = await apiClient.Environments.listEnvironments({ query: { projectId: this.id } })
        .then(response => extractData(response, 200))
      return this.environments
    },
    create: async (envData: Omit<CreateEnvironmentBody, 'projectId'>) => {
      const callback = this.addOperation('envManagement')
      try {
        const env = await apiClient.Environments.createEnvironment({ body: { ...envData, projectId: this.id } })
          .then(response => extractData(response, 201))
        this.environments = this.environments ? this.environments.concat([env]) : [env]
        return this.environments
      } finally { callback() }
    },
    update: async (id: Environment['id'], environment: UpdateEnvironmentBody) => {
      const callback = this.addOperation('envManagement')
      try {
        await apiClient.Environments.updateEnvironment({ body: environment, params: { environmentId: id } })
          .then(response => extractData(response, 200))
        await this.Environments.list()
        return this.environments
      } finally { callback() }
    },
    delete: async (environmentId: Environment['id']) => {
      const callback = this.addOperation('envManagement')
      try {
        await apiClient.Environments.deleteEnvironment({ params: { environmentId } })
          .then(response => extractData(response, 204))
        await this.Environments.list()
        return this.environments
      } finally { callback() }
    },
  }

  Repositories = {
    list: async () => {
      this.repositories = await apiClient.Repositories.listRepositories({ query: { projectId: this.id } })
        .then(response => extractData(response, 200))
      return this.repositories
    },
    sync: async (repositoryId: Repo['id'], { branchName, syncAllBranches = false }: { branchName?: string, syncAllBranches?: boolean }) => {
      const callback = this.addOperation('repoManagement')
      try {
        return apiClient.Repositories.syncRepository({
          params: { repositoryId },
          body: { branchName, syncAllBranches },
        })
          .then(response => extractData(response, 204))
      } finally { callback() }
    },
    create: async (repoData: Omit<CreateRepositoryBody, 'projectId'>) => {
      const callback = this.addOperation('repoManagement')
      try {
        const repo = await apiClient.Repositories.createRepository({ body: { ...repoData, projectId: this.id } })
          .then(response => extractData(response, 201))
        this.repositories = this.repositories ? this.repositories.concat([repo]) : [repo]
        return this.repositories
      } finally { callback() }
    },
    update: async (id: RepositoryParams['repositoryId'], repoData: Omit<UpdateRepositoryBody, 'projectId'>) => {
      const callback = this.addOperation('repoManagement')
      try {
        await apiClient.Repositories.updateRepository({ body: { ...repoData, projectId: this.id }, params: { repositoryId: id } })
          .then(response => extractData(response, 200))
        return this.Repositories.list()
      } finally { callback() }
    },
    delete: async (repositoryId: Repo['id']) => {
      const callback = this.addOperation('repoManagement')
      try {
        await apiClient.Repositories.deleteRepository({ params: { repositoryId } })
          .then(response => extractData(response, 204))
        return this.Repositories.list()
      } finally { callback() }
    },
  }

  Roles = {
    countMembers: async () => {
      return apiClient.ProjectsRoles.projectRoleMemberCounts({ params: { projectId: this.id } })
        .then(response => extractData(response, 200))
    },
    list: async () => {
      this.roles = await apiClient.ProjectsRoles.listProjectRoles({ params: { projectId: this.id } })
        .then(response => extractData(response, 200))
      this.computePerms()
      return this.roles
    },
    patch: async (body: typeof projectRoleContract.patchProjectRoles.body._type) => {
      const callback = this.addOperation('update')
      try {
        this.roles = await apiClient.ProjectsRoles.patchProjectRoles({ body, params: { projectId: this.id } })
          .then(response => extractData(response, 200))
        this.computePerms()
        return this.roles
      } finally { callback() }
    },
    create: async (body: typeof projectRoleContract.createProjectRole.body._type) => {
      const callback = this.addOperation('update')
      try {
        this.roles = await apiClient.ProjectsRoles.createProjectRole({ body, params: { projectId: this.id } })
          .then(response => extractData(response, 201))
        this.computePerms()
        return this.roles
      } finally { callback() }
    },
    delete: async (roleId: Role['id']) => {
      const callback = this.addOperation('update')
      try {
        await apiClient.ProjectsRoles.deleteProjectRole({ params: { projectId: this.id, roleId } })
          .then(response => extractData(response, 204))
        this.computePerms()
        return this.Roles.list()
      } finally { callback() }
    },
  }

  Services = {
    getSecrets: async () => {
      return apiClient.Projects.getProjectSecrets({ params: { projectId: this.id } })
        .then(response => extractData(response, 200))
    },
    list: async (permissionTarget: PermissionTarget = 'user') => {
      this.services = await apiClient.ProjectServices.getServices({ params: { projectId: this.id }, query: { permissionTarget } })
        .then(response => extractData(response, 200))
      return this.services
    },
    update: async (body: PluginsUpdateBody) => {
      const callback = this.addOperation('update')
      try {
        await apiClient.ProjectServices.updateProjectServices({ params: { projectId: this.id }, body })
          .then(response => extractData(response, 204))
        return this.Services.list()
      } finally { callback() }
    },
  }
}
