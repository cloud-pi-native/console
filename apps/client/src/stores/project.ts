// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import { defineStore } from 'pinia'
import type { Ref } from 'vue'
import { ref } from 'vue'
import type { CreateProjectBody, Environment, Organization, ProjectV2, Repo, Role, projectContract, projectRoleContract } from '@cpn-console/shared'
import { PROJECT_PERMS, getPermsByUserRoles, resourceListToDict, sortArrByObjKeyAsc } from '@cpn-console/shared'
import { useUserStore } from './user.js'
import { useOrganizationStore } from './organization.js'
import { apiClient, extractData } from '@/api/xhr-client.js'

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
  repositories?: Repo[]
  environments?: Environment[]
  addOperation: (name: ProjectOperations) => { fn: (name: ProjectOperations) => boolean, args: ProjectOperations }
  removeOperation: (name: ProjectOperations) => boolean
}

export const useProjectStore = defineStore('project', () => {
  const selectedProject = ref<ProjectWithOrganization>()
  const projectsById = ref<Record<string, ProjectWithOrganization>>({})
  const projects = computed(() => sortArrByObjKeyAsc(Object.values(projectsById.value), 'name'))
  const userStore = useUserStore()
  const organizationStore = useOrganizationStore()
  const selectedProjectPerms = computed(() => {
    if (!selectedProject.value) return 0n
    const selfId = userStore.userProfile?.id
    if (selfId === selectedProject.value?.ownerId) return PROJECT_PERMS.MANAGE
    const selfMember = selectedProject.value.members.find(member => member.userId === selfId)
    if (!selfMember) return 0n

    return getPermsByUserRoles(selfMember.roleIds, resourceListToDict(selectedProject.value.roles), selectedProject.value.everyonePerms)
  })

  const setSelectedProject = (id: string) => {
    selectedProject.value = projects.value.find(project => project.id === id)
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
      if (projectsById.value[project.id]) {
        projectsById.value[project.id] = {
          ...projectsById.value[project.id],
          ...project,
        }
      } else {
        const operationsInProgress = projectsById.value[project.id]
          ? projectsById.value[project.id].operationsInProgress
          : ref(new Set<ProjectOperations>())

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
        projectsById.value[project.id] = {
          ...project,
          operationsInProgress,
          addOperation,
          removeOperation,
          organization: organizationStore.organizationsById[project.organizationId] as Organization,
        }
      }
    }
    if (selectedProject.value) {
      setSelectedProject(selectedProject.value.id)
    }
  }

  const updateProject = async (projectId: string, data: typeof projectContract.updateProject.body._type) => {
    return apiClient.Projects.updateProject({ body: data, params: { projectId } })
      .then(response => extractData(response, 200))
  }

  const createProject = async (body: CreateProjectBody) => {
    const res = await apiClient.Projects.createProject({ body })
      .then(response => extractData(response, 201))
    await listProjects()
    return res
  }

  const replayHooksForProject = async (projectId: string) => {
    await apiClient.Projects.replayHooksForProject({ params: { projectId } })
      .then(response => extractData(response, 204))
  }

  const archiveProject = async (projectId: string) => {
    await apiClient.Projects.archiveProject({ params: { projectId } })
      .then(response => extractData(response, 204))
    selectedProject.value = undefined
  }

  const getProjectSecrets = (projectId: string) => apiClient.Projects.getProjectSecrets({ params: { projectId } })
    .then(response => extractData(response, 200))

  const handleProjectLocking = (projectId: string, lock: boolean) =>
    apiClient.Projects.updateProject({ body: { locked: lock }, params: { projectId } })
      .then(response => extractData(response, 200))

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
    handleProjectLocking,
    generateProjectsData,
    selectedProject,
    projects,
    projectsById,
    selectedProjectPerms,
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
