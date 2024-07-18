import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateProjectBody, Organization, ProjectV2, UpdateProjectBody, projectContract } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { useUsersStore } from './users.js'
import { useOrganizationStore } from './organization.js'

export type ProjectWithOrganization = ProjectV2 & { organization: Organization }

export const useProjectStore = defineStore('project', () => {
  const selectedProject = ref<ProjectWithOrganization>()
  const projects = ref<ProjectWithOrganization[]>([])
  const usersStore = useUsersStore()
  const organizationStore = useOrganizationStore()

  const setSelectedProject = (id: string) => {
    selectedProject.value = projects.value.find(project => project.id === id)
  }

  const updateProject = async (projectId: string, data: UpdateProjectBody) => {
    await apiClient.Projects.updateProject({ body: data, params: { projectId } })
      .then(response => extractData(response, 200))
    await listProjects()
  }

  const listProjects = async (query: typeof projectContract.listProjects.query._type = { filter: 'member', statusNotIn: 'archived' }) => {
    const res = await apiClient.Projects.listProjects({ query })
      .then(response => extractData(response, 200))
    await organizationStore.listOrganizations()
    projects.value = res.map(project => ({ ...project, organization: organizationStore.organizationsById[project.organizationId] as Organization }))
    projects.value.forEach(project => {
      usersStore.addUsersFromMembers(project.members)
    })
    if (selectedProject.value) {
      setSelectedProject(selectedProject.value.id)
    }
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
    apiClient.Projects.patchProject({ body: { lock }, params: { projectId } })
      .then(response => extractData(response, 200))

  const generateProjectsData = () =>
    apiClient.Projects.getProjectsData()
      .then(response => extractData(response, 200))

  return {
    handleProjectLocking,
    generateProjectsData,
    selectedProject,
    projects,
    setSelectedProject,
    listProjects,
    updateProject,
    createProject,
    replayHooksForProject,
    archiveProject,
    getProjectSecrets,
  }
})
