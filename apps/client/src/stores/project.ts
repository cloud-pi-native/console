// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import { defineStore } from 'pinia'
import type { Ref } from 'vue'
import { ref } from 'vue'
import type { CreateProjectBody, Environment, Organization, ProjectV2, Repo, Role, projectContract, projectRoleContract } from '@cpn-console/shared'
import { PROJECT_PERMS, ProjectAuthorized, getPermsByUserRoles, resourceListToDict, sortArrByObjKeyAsc } from '@cpn-console/shared'
import pDebounce from 'p-debounce'
import { useUserStore } from './user.js'
import { useOrganizationStore } from './organization.js'
import { apiClient, extractData } from '@/api/xhr-client.js'

type StoresTarget = ('mine' | 'all')[]
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

export type ProjectWithOrganization = ProjectV2 & {
  organization: Organization
  operationsInProgress: Ref<Set<ProjectOperations>>
  repositories: Repo[]
  environments: Environment[]
  addOperation: (name: ProjectOperations) => { fn: (name: ProjectOperations) => boolean, args: ProjectOperations }
  removeOperation: (name: ProjectOperations) => boolean
  myPerms?: bigint
}

function calculateProjectPerms(project: ProjectV2 | undefined, userId: string | undefined) {
  if (!project || !userId) return 0n
  if (userId === project?.ownerId) return PROJECT_PERMS.MANAGE
  const selfMember = project.members.find(member => member.userId === userId)
  if (!selfMember) return 0n

  return getPermsByUserRoles(selfMember.roleIds, resourceListToDict(project.roles), project.everyonePerms)
}
export const useProjectStore = defineStore('project', () => {
  const organizationStore = useOrganizationStore()

  function mergeOrCreateProject(projectReceived: ProjectV2, projectInStore?: Omit<ProjectWithOrganization, 'environments' | 'repositories'>): Omit<ProjectWithOrganization, 'environments' | 'repositories'> {
    if (projectInStore) {
      return {
        ...projectInStore,
        ...projectReceived,
      }
    }
    const operationsInProgress = ref(new Set<ProjectOperations>())

    function removeOperation(operationName: ProjectOperations) {
      return operationsInProgress.value.delete(operationName)
    }

    function addOperation(operationName: ProjectOperations) {
      if (operationsInProgress.value.has(operationName)) {
        operationName += getRandomId()
      }
      if (operationsInProgress.value.size <= 1) {
        operationsInProgress.value.add(operationName)
      } else {
        return { fn: (_: string) => false, args: operationName }
      }

      return { fn: removeOperation, args: operationName }
    }
    return {
      ...projectReceived,
      operationsInProgress,
      addOperation,
      removeOperation,
      organization: organizationStore.organizationsById[projectReceived.organizationId] as Organization,
    }
  }

  const userStore = useUserStore()

  // mostly for admin views
  const projectsById = ref<Record<string, Omit<ProjectWithOrganization, 'environments' | 'repositories'>>>({})
  const projects = computed(() => sortArrByObjKeyAsc(Object.values(projectsById.value), 'name'))

  // mostly for project views
  const selectedProjectId = ref<ProjectWithOrganization['id']>('')
  const myProjectsById = ref<Record<string, ProjectWithOrganization>>({})
  const myProjects = computed(() => sortArrByObjKeyAsc([
    ...Object.values(myProjectsById.value),
  ], 'name'))

  const selectedProject = computed(() => myProjectsById.value[selectedProjectId.value])

  const selectedProjectPerms = computed(() => calculateProjectPerms(selectedProject.value, userStore.userProfile?.id))

  async function updateStores(project: ProjectV2, stores: StoresTarget = [], force = false) {
    if (stores.includes('all')) {
      projectsById.value[project.id] = mergeOrCreateProject(project, projectsById.value[project.id])
    }
    if (stores.includes('mine')) {
      const mergedProject = mergeOrCreateProject(project, myProjectsById.value[project.id])
      const myPerms = calculateProjectPerms(mergedProject, userStore.userProfile?.id)
      const promises: [Promise<Environment[]> | undefined, Promise<Repo[]> | undefined] = [undefined, undefined]
      if (ProjectAuthorized.ListEnvironments({ projectPermissions: myPerms })) {
        promises[0] = !myProjectsById.value[project.id]?.environments || force
          ? apiClient.Environments.listEnvironments({ query: { projectId: project.id } })
            .then(res => extractData(res, 200))
          : Promise.resolve(myProjectsById.value[project.id]?.environments)
      }
      if (ProjectAuthorized.ListRepositories({ projectPermissions: myPerms })) {
        promises[1] = !myProjectsById.value[project.id]?.repositories || force
          ? apiClient.Repositories.listRepositories({ query: { projectId: project.id } })
            .then(res => extractData(res, 200))
          : Promise.resolve(myProjectsById.value[project.id]?.repositories)
      }
      const [environments, repositories] = await Promise.all(promises)
      myProjectsById.value[project.id] = {
        ...mergedProject,
        environments: environments ?? [],
        repositories: repositories ?? [],
        myPerms,
      }
    }
  }

  const setSelectedProject = (id: string) => {
    selectedProjectId.value = id
  }

  const listProjects = async (query: typeof projectContract.listProjects.query._type = { filter: 'member', statusNotIn: 'archived' }) => {
    const res = await apiClient.Projects.listProjects({ query })
      .then(response => extractData(response, 200))
    await organizationStore.listOrganizations()
    // remove old projects not in response
    for (const project of projects.value) {
      if (!res.find(({ id }) => id === project.id)) {
        delete projectsById.value[project.id]
      }
    }
    for (const project of res) {
      await updateStores(project, ['all'])
    }
  }
  const getMyProjects = pDebounce(async (force: boolean = false) => {
    const res = await apiClient.Projects.listProjects({ query: { filter: 'member', statusNotIn: 'archived' } })
      .then(response => extractData(response, 200))
    if (res.some(project => !organizationStore.organizationsById[project.organizationId])) {
      await organizationStore.listOrganizations()
    }
    // remove old projects not in response
    for (const project of myProjects.value) {
      if (!res.find(({ id }) => id === project.id)) {
        delete myProjectsById.value[project.id]
      }
    }
    await Promise.all(res.map(project => updateStores(project, ['mine'], force)))
  }, 300, { before: true })

  const getProject = async (projectId: ProjectV2['id'], stores?: StoresTarget) => {
    const project = await apiClient.Projects.getProject({ params: { projectId } })
      .then(response => extractData(response, 200))
    await updateStores(project, stores)
  }

  const updateProject = async (projectId: string, data: typeof projectContract.updateProject.body._type, stores?: StoresTarget) => {
    const project = await apiClient.Projects.updateProject({ body: data, params: { projectId } })
      .then(response => extractData(response, 200))
    await updateStores(project, stores)
  }

  const createProject = async (body: CreateProjectBody) => {
    const project = await apiClient.Projects.createProject({ body })
      .then(response => extractData(response, 201))
    await updateStores(project, ['mine'])
  }

  const replayHooksForProject = async (projectId: string, stores?: StoresTarget) => {
    await apiClient.Projects.replayHooksForProject({ params: { projectId } })
      .then(response => extractData(response, 204))
    await getProject(projectId, stores)
  }

  const archiveProject = async (projectId: string) => {
    await apiClient.Projects.archiveProject({ params: { projectId } })
      .then(response => extractData(response, 204))
    delete myProjectsById.value[projectId]
  }

  const getProjectSecrets = (projectId: string) => apiClient.Projects.getProjectSecrets({ params: { projectId } })
    .then(response => extractData(response, 200))

  async function handleProjectLocking(projectId: string, lock: boolean, stores?: StoresTarget) {
    const project = await apiClient.Projects.updateProject({ body: { locked: lock }, params: { projectId } })
      .then(response => extractData(response, 200))
    await updateStores(project, stores)
  }

  const generateProjectsData = () =>
    apiClient.Projects.getProjectsData()
      .then(response => extractData(response, 200))

  const createRole = (projectId: ProjectV2['id'], body: typeof projectRoleContract.createProjectRole.body._type) =>
    apiClient.ProjectsRoles.createProjectRole({ body, params: { projectId } })
      .then(response => extractData(response, 201))

  const deleteRole = (projectId: ProjectV2['id'], roleId: Role['id']) =>
    apiClient.ProjectsRoles.deleteProjectRole({ params: { projectId, roleId } })
      .then(response => extractData(response, 200))

  const patchRoles = (projectId: ProjectV2['id'], body: typeof projectRoleContract.patchProjectRoles.body._type) =>
    apiClient.ProjectsRoles.patchProjectRoles({ body, params: { projectId } })
      .then(response => extractData(response, 200))

  return {
    selectedProject,
    selectedProjectId,
    myProjects,
    myProjectsById,
    projects,
    projectsById,
    selectedProjectPerms,
    getProject,
    getMyProjects,
    handleProjectLocking,
    generateProjectsData,
    setSelectedProject,
    listProjects,
    updateProject,
    createProject,
    replayHooksForProject,
    archiveProject,
    getProjectSecrets,
    createRole,
    deleteRole,
    patchRoles,
  }
})
