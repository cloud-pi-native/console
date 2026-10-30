import type {
  CreateDeploymentBody,
  CreateEnvironment,
  CreateProjectBody,
  CreateProjectRoleBody,
  CreateRepositoryBodyV2,
  Deployment,
  Environment,
  GetLogsQuery,
  ListProjectsQuery,
  PatchMembersBody,
  PatchProjectRolesBody,
  PermissionTarget,
  PluginsUpdateBody,
  ProjectV2,
  Repo,
  Role,
  SyncRepositoryBodyV2,
  UpdateDeploymentBody,
  UpdateEnvironment,
  UpdateProjectBody,
  UpdateRepositoryBodyV2,
  User,
} from '@cpn-console/shared'
import type { Project, ProjectOperations } from '@/utils/project-utils.js'
import pDebounce from 'p-debounce'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { getRandomId } from '@/utils/func.js'
import { calculateProjectPerms, createProjectState } from '@/utils/project-utils.js'
import { useLogStore } from './log.js'
import { useUserStore } from './user.js'

const REPLAY_REQUIRED_OPERATIONS = new Set<ProjectOperations>(['teamManagement', 'saveServices', 'roleManagement'])

export const useProjectStore = defineStore('project', () => {
  const userStore = useUserStore()

  const amIPartOf = (project: Project) =>
    project.status !== 'archived'
    && (project.ownerId === userStore.userProfile?.id
      || project.members.some(member => member.userId === userStore.userProfile?.id))

  // Single source of truth: plain project state, keyed by slug.
  const projectsBySlug = ref<Record<string, Project>>({})

  const projects = computed(() =>
    Object.values(projectsBySlug.value).sort((p1, p2) => p1.slug.localeCompare(p2.slug)),
  )

  const myProjects = computed(() =>
    Object.values(projectsBySlug.value).filter(project => amIPartOf(project)),
  )

  function requireProject(projectId: ProjectV2['id']): Project {
    const project = Object.values(projectsBySlug.value)
      .find(candidate => candidate.id === projectId || candidate.slug === projectId)
    if (!project) throw new Error(`Projet introuvable : ${projectId}`)
    return project
  }

  function refreshPerms(project: Project): void {
    project.myPerms = calculateProjectPerms(project, userStore.userProfile?.id)
  }

  function endOperation(project: Project, operation: string): void {
    setTimeout(() => {
      useLogStore().needRefresh = true
    }, 100)
    project.operationsInProgress = project.operationsInProgress.filter(candidate => candidate !== operation)
  }

  function beginOperation(project: Project, operation: ProjectOperations): () => void {
    project.needReplay = REPLAY_REQUIRED_OPERATIONS.has(operation)

    if (project.operationsInProgress.length > 1) {
      return () => {}
    }

    const tracked = project.operationsInProgress.includes(operation)
      ? `${operation}-${getRandomId()}`
      : operation
    project.operationsInProgress.push(tracked)
    return () => endOperation(project, tracked)
  }

  function updateStore(projectsReceived: ProjectV2[]): Project[] {
    return projectsReceived.map((incoming) => {
      const existing = projectsBySlug.value[incoming.slug]
      if (existing) {
        // Keep the locally loaded resources: the API payload does not include them.
        Object.assign(existing, incoming)
        refreshPerms(existing)
        return existing
      }
      const created = createProjectState(incoming, userStore.userProfile?.id)
      projectsBySlug.value[incoming.slug] = created
      return created
    })
  }

  function selectFromStore(slugs: ProjectV2['slug'][]): Project[] {
    return slugs
      .filter(slug => slug in projectsBySlug.value)
      .map(slug => projectsBySlug.value[slug])
  }

  const getProject = async (projectId: ProjectV2['id']): Promise<Project> => {
    const response = await apiClient.Projects.getProject({ params: { projectId } })
    const project = extractData(response, 200)
    return updateStore([project])[0]
  }

  const listProjects = async (
    query: ListProjectsQuery = {
      filter: 'member',
      statusNotIn: 'archived',
    },
  ): Promise<Project[]> => {
    const response = await apiClient.Projects.listProjects({ query })
    const projectsReceived: ProjectV2[] = extractData(response, 200)
    updateStore(projectsReceived)
    return selectFromStore(projectsReceived.map(project => project.slug))
  }

  const listMyProjects = pDebounce(async (): Promise<Project[]> => {
    const response = await apiClient.Projects.listProjects({
      query: { filter: 'member', statusNotIn: 'archived' },
    })
    const projectsReceived: ProjectV2[] = extractData(response, 200)

    for (const storedProject of myProjects.value) {
      if (!projectsReceived.some(project => project.id === storedProject.id)) {
        delete projectsBySlug.value[storedProject.slug]
      }
    }

    updateStore(projectsReceived)
    return selectFromStore(projectsReceived.map(project => project.slug))
  }, 200)

  const createProject = async (body: CreateProjectBody): Promise<Project> => {
    const response = await apiClient.Projects.createProject({ body })
    const project = extractData(response, 201)
    const created = createProjectState(project, userStore.userProfile?.id)
    projectsBySlug.value[created.slug] = created
    return created
  }

  const updateProject = async (projectId: ProjectV2['id'], body: UpdateProjectBody): Promise<Project> => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'update')
    try {
      const response = await apiClient.Projects.updateProject({ body, params: { projectId: project.id } })
      Object.assign(project, extractData(response, 200))
      refreshPerms(project)
      return project
    } finally {
      done()
    }
  }

  const refreshProject = async (projectId: ProjectV2['id']): Promise<Project> => {
    const project = requireProject(projectId)
    const response = await apiClient.Projects.getProject({ params: { projectId: project.id } })
    Object.assign(project, extractData(response, 200))
    refreshPerms(project)
    await Promise.all([
      listRepositories(project.id),
      listEnvironments(project.id),
    ])
    return project
  }

  const replayProjectHooks = async (projectId: ProjectV2['id']): Promise<Project> => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'replay')
    try {
      const response = await apiClient.Projects.replayHooksForProject({ params: { projectId: project.id } })
      extractData(response, 204)
    } finally {
      done()
    }
    return refreshProject(project.id)
  }

  const archiveProject = async (projectId: ProjectV2['id']): Promise<void> => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'delete')
    try {
      const response = await apiClient.Projects.archiveProject({ params: { projectId: project.id } })
      extractData(response, 204)
      project.status = 'archived'
    } catch {
      await refreshProject(project.id)
    } finally {
      done()
    }
  }

  // Members -----------------------------------------------------------------
  const listMembers = async (projectId: ProjectV2['id']) => {
    const project = requireProject(projectId)
    const response = await apiClient.ProjectsMembers.listMembers({ params: { projectId: project.id } })
    project.members = extractData(response, 200)
    return project.members
  }

  const addMember = async (projectId: ProjectV2['id'], email: string) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'teamManagement')
    try {
      const response = await apiClient.ProjectsMembers.addMember({ params: { projectId: project.id }, body: { email } })
      extractData(response, 201)
    } finally {
      done()
    }
    return listMembers(project.id)
  }

  const removeMember = async (projectId: ProjectV2['id'], userId: User['id']) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'teamManagement')
    try {
      const response = await apiClient.ProjectsMembers.removeMember({ params: { projectId: project.id, userId } })
      extractData(response, 200)
    } finally {
      done()
    }
    return listMembers(project.id)
  }

  const patchMembers = async (projectId: ProjectV2['id'], body: PatchMembersBody) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'teamManagement')
    try {
      const response = await apiClient.ProjectsMembers.patchMembers({ params: { projectId: project.id }, body })
      extractData(response, 200)
    } finally {
      done()
    }
    return listMembers(project.id)
  }

  const getCandidateUsers = async (projectId: ProjectV2['id'], letters: string) => {
    const project = requireProject(projectId)
    const response = await apiClient.Users.getMatchingUsers({ query: { letters, notInProjectId: project.id } })
    return extractData(response, 200)
  }

  // Deployments -------------------------------------------------------------
  const listDeployments = async (projectId: ProjectV2['id']) => {
    const project = requireProject(projectId)
    const response = await apiClient.Deployments.listDeployments({ params: { projectId: project.id } })
    project.deployments = extractData(response, 200)
    return project.deployments
  }

  const createDeployment = async (projectId: ProjectV2['id'], body: Omit<CreateDeploymentBody, 'projectId'>) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'deploymentManagement')
    try {
      const response = await apiClient.Deployments.createDeployment({
        params: { projectId: project.id },
        body: { ...body, projectId: project.id },
      })
      extractData(response, 201)
    } finally {
      done()
    }
  }

  const updateDeployment = async (projectId: ProjectV2['id'], deploymentId: Deployment['id'], body: UpdateDeploymentBody) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'deploymentManagement')
    try {
      const response = await apiClient.Deployments.updateDeployment({
        params: { projectId: project.id, deploymentId },
        body,
      })
      extractData(response, 200)
    } finally {
      done()
    }
  }

  const deleteDeployment = async (projectId: ProjectV2['id'], deploymentId: Deployment['id']) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'deploymentManagement')
    try {
      const response = await apiClient.Deployments.deleteDeployment({
        params: { projectId: project.id, deploymentId },
      })
      extractData(response, 204)
    } finally {
      done()
    }
  }

  // Environments ------------------------------------------------------------
  async function listEnvironments(projectId: ProjectV2['id']) {
    const project = requireProject(projectId)
    const response = await apiClient.EnvironmentsV2.listEnvironmentsV2({ params: { projectId: project.id } })
    project.environments = extractData(response, 200)
    return project.environments
  }

  const createEnvironment = async (projectId: ProjectV2['id'], body: CreateEnvironment) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'envManagement')
    try {
      const response = await apiClient.EnvironmentsV2.createEnvironmentV2({ params: { projectId: project.id }, body })
      extractData(response, 201)
    } finally {
      done()
    }
    return listEnvironments(project.id)
  }

  const updateEnvironment = async (projectId: ProjectV2['id'], environmentId: Environment['id'], body: UpdateEnvironment) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'envManagement')
    try {
      const response = await apiClient.EnvironmentsV2.updateEnvironmentV2({
        body,
        params: { projectId: project.id, environmentId },
      })
      extractData(response, 200)
    } finally {
      done()
    }
    return listEnvironments(project.id)
  }

  const deleteEnvironment = async (projectId: ProjectV2['id'], environmentId: Environment['id']) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'envManagement')
    try {
      const response = await apiClient.EnvironmentsV2.deleteEnvironmentV2({
        params: { projectId: project.id, environmentId },
      })
      extractData(response, 204)
    } finally {
      done()
    }
    return listEnvironments(project.id)
  }

  // Repositories ------------------------------------------------------------
  async function listRepositories(projectId: ProjectV2['id']) {
    const project = requireProject(projectId)
    const response = await apiClient.RepositoriesV2.listRepositoriesV2({ params: { projectId: project.id } })
    project.repositories = extractData(response, 200)
    return project.repositories
  }

  const syncRepository = async (projectId: ProjectV2['id'], repositoryId: Repo['id'], body: SyncRepositoryBodyV2) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'repoManagement')
    try {
      const response = await apiClient.RepositoriesV2.syncRepositoryV2({
        params: { projectId: project.id, repositoryId },
        body,
      })
      return extractData(response, 204)
    } finally {
      done()
    }
  }

  const createRepository = async (projectId: ProjectV2['id'], body: CreateRepositoryBodyV2) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'repoManagement')
    try {
      const response = await apiClient.RepositoriesV2.createRepositoryV2({ params: { projectId: project.id }, body })
      extractData(response, 201)
    } finally {
      done()
    }
    return listRepositories(project.id)
  }

  const updateRepository = async (projectId: ProjectV2['id'], repositoryId: Repo['id'], body: UpdateRepositoryBodyV2) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'repoManagement')
    try {
      const response = await apiClient.RepositoriesV2.updateRepositoryV2({
        params: { projectId: project.id, repositoryId },
        body,
      })
      extractData(response, 200)
    } finally {
      done()
    }
    return listRepositories(project.id)
  }

  const deleteRepository = async (projectId: ProjectV2['id'], repositoryId: Repo['id']) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'repoManagement')
    try {
      const response = await apiClient.RepositoriesV2.deleteRepositoryV2({
        params: { projectId: project.id, repositoryId },
      })
      extractData(response, 204)
    } finally {
      done()
    }
    return listRepositories(project.id)
  }

  // Roles -------------------------------------------------------------------
  const countRoleMembers = async (projectId: ProjectV2['id']) => {
    const project = requireProject(projectId)
    const response = await apiClient.ProjectsRoles.projectRoleMemberCounts({ params: { projectId: project.id } })
    return extractData(response, 200)
  }

  const listProjectRoles = async (projectId: ProjectV2['id']) => {
    const project = requireProject(projectId)
    const response = await apiClient.ProjectsRoles.listProjectRoles({ params: { projectId: project.id } })
    project.roles = extractData(response, 200)
    refreshPerms(project)
    return project.roles
  }

  const patchProjectRoles = async (projectId: ProjectV2['id'], body: PatchProjectRolesBody) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'roleManagement')
    try {
      const response = await apiClient.ProjectsRoles.patchProjectRoles({ body, params: { projectId: project.id } })
      project.roles = extractData(response, 200)
      refreshPerms(project)
      return project.roles
    } finally {
      done()
    }
  }

  const createProjectRole = async (projectId: ProjectV2['id'], body: CreateProjectRoleBody) => {
    const project = requireProject(projectId)
    const response = await apiClient.ProjectsRoles.createProjectRole({ body, params: { projectId: project.id } })
    project.roles = extractData(response, 201)
    refreshPerms(project)
    return project.roles
  }

  const deleteProjectRole = async (projectId: ProjectV2['id'], roleId: Role['id']) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'roleManagement')
    try {
      const response = await apiClient.ProjectsRoles.deleteProjectRole({ params: { projectId: project.id, roleId } })
      extractData(response, 204)
    } finally {
      done()
    }
    return listProjectRoles(project.id)
  }

  // Services ----------------------------------------------------------------
  const getProjectSecrets = async (projectId: ProjectV2['id']) => {
    const project = requireProject(projectId)
    const response = await apiClient.Projects.getProjectSecrets({ params: { projectId: project.id } })
    return extractData(response, 200)
  }

  const listProjectServices = async (projectId: ProjectV2['id'], permissionTarget: PermissionTarget = 'user') => {
    const project = requireProject(projectId)
    const response = await apiClient.ProjectServices.getServices({
      params: { projectId: project.id },
      query: { permissionTarget },
    })
    project.services = extractData(response, 200)
    return project.services
  }

  const updateProjectServices = async (projectId: ProjectV2['id'], body: PluginsUpdateBody) => {
    const project = requireProject(projectId)
    const done = beginOperation(project, 'saveServices')
    try {
      const response = await apiClient.ProjectServices.updateProjectServices({ params: { projectId: project.id }, body })
      extractData(response, 204)
    } finally {
      done()
    }
    return listProjectServices(project.id)
  }

  // Logs --------------------------------------------------------------------
  const listProjectLogs = async (projectId: ProjectV2['id'], query?: GetLogsQuery) => {
    const project = requireProject(projectId)
    const effectiveQuery = query ?? { offset: 0, limit: 10 }
    const response = await apiClient.Logs.getLogs({ query: { ...effectiveQuery, projectId: project.id } })
    return extractData(response, 200)
  }

  const generateProjectsData = async () => {
    const response = await apiClient.Projects.getProjectsData()
    return extractData(response, 200)
  }

  // Should only be used outside the project route; updated by the route guard.
  const lastSelectedProjectSlug = ref<ProjectV2['slug']>()

  return {
    projects,
    projectsBySlug,
    myProjects,
    lastSelectedProjectSlug,
    getProject,
    listProjects,
    listMyProjects,
    createProject,
    updateProject,
    refreshProject,
    replayProjectHooks,
    archiveProject,
    listMembers,
    addMember,
    removeMember,
    patchMembers,
    getCandidateUsers,
    listDeployments,
    createDeployment,
    updateDeployment,
    deleteDeployment,
    listEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    listRepositories,
    syncRepository,
    createRepository,
    updateRepository,
    deleteRepository,
    countRoleMembers,
    listProjectRoles,
    patchProjectRoles,
    createProjectRole,
    deleteProjectRole,
    getProjectSecrets,
    listProjectServices,
    updateProjectServices,
    listProjectLogs,
    generateProjectsData,
    updateStore,
  }
})
