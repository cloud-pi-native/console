import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateProjectBody, Organization, ProjectV2, Role, projectContract, projectRoleContract } from '@cpn-console/shared'
import { PROJECT_PERMS, getPermsByUserRoles, resourceListToDict } from '@cpn-console/shared'
import { useUserStore } from './user.js'
import { useOrganizationStore } from './organization.js'
import { apiClient, extractData } from '@/api/xhr-client.js'

export type ProjectWithOrganization = ProjectV2 & { organization: Organization }

export const useProjectStore = defineStore('project', () => {
  const selectedProject = ref<ProjectWithOrganization>()
  const projects = ref<ProjectWithOrganization[]>([])
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
    projects.value = res.map(project => ({ ...project, organization: organizationStore.organizationsById[project.organizationId] as Organization }))
    if (selectedProject.value) {
      setSelectedProject(selectedProject.value.id)
    }
  }

  const updateProject = async (projectId: string, data: typeof projectContract.updateProject.body._type) => {
    const project = await apiClient.Projects.updateProject({ body: data, params: { projectId } })
      .then(response => extractData(response, 200))
    await listProjects()
    return project
  }

  const createProject = async (body: CreateProjectBody) => {
    await apiClient.Projects.createProject({ body })
      .then(response => extractData(response, 201))
    await listProjects()
  }

  const replayHooksForProject = async (projectId: string) => {
    await apiClient.Projects.replayHooksForProject({ params: { projectId } })
      .then(response => extractData(response, 204))
    await listProjects()
  }

  const archiveProject = async (projectId: string) => {
    await apiClient.Projects.archiveProject({ params: { projectId } })
      .then(response => extractData(response, 204))
    selectedProject.value = undefined
    await listProjects()
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
