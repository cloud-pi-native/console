import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateProjectBody, Project, Role, UpdateProjectBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectStore = defineStore('project', () => {
  const selectedProject = ref<Project>()
  const projects = ref<Project[]>([])

  const setSelectedProject = (id: string) => {
    selectedProject.value = projects.value.find(project => project.id === id)
  }

  const updateProject = async (projectId: string, data: UpdateProjectBody) => {
    await apiClient.Projects.updateProject({ body: data, params: { projectId } })
      .then(response => extractData(response, 200))
    await getUserProjects()
  }

  const getUserProjects = async () => {
    const res = await apiClient.Projects.getProjects()
      .then(response => extractData(response, 200))
    if (!res) return
    projects.value = res
    if (selectedProject.value) {
      setSelectedProject(selectedProject.value.id)
    }
  }

  const createProject = async (body: CreateProjectBody) => {
    await apiClient.Projects.createProject({ body })
      .then(response => extractData(response, 201))
    await getUserProjects()
  }

  const replayHooksForProject = async (projectId: string) => {
    await apiClient.Projects.replayHooksForProject({ params: { projectId } })
      .then(response => extractData(response, 204))
    await getUserProjects()
  }

  const archiveProject = async (projectId: string) => {
    await apiClient.Projects.archiveProject({ params: { projectId } })
      .then(response => extractData(response, 204))
    selectedProject.value = undefined
    await getUserProjects()
  }

  const getProjectSecrets = (projectId: string) => apiClient.Projects.getProjectSecrets({ params: { projectId } })
    .then(response => extractData(response, 200))

  const updateProjectRoles = (projectId: string, roles: Role[]) => {
    const project = projects.value.find(project => project.id === projectId)
    if (!project) return
    project.roles = roles
  }

  return {
    selectedProject,
    projects,
    setSelectedProject,
    updateProject,
    getUserProjects,
    createProject,
    replayHooksForProject,
    archiveProject,
    getProjectSecrets,
    updateProjectRoles,
  }
})
