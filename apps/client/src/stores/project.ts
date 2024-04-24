import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateProjectBody, Project, Role, UpdateProjectBody } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useProjectStore = defineStore('project', () => {
  const selectedProject = ref<Project>()
  const projects = ref<Project[]>([])

  const setSelectedProject = (id: string) => {
    selectedProject.value = projects.value.find(project => project.id === id)
  }

  const updateProject = async (projectId: string, data: UpdateProjectBody) => {
    await api.updateProject(projectId, data)
    await getUserProjects()
  }

  const getUserProjects = async () => {
    const res = await api.getUserProjects()
    if (!res) return
    projects.value = res
    if (selectedProject.value) {
      setSelectedProject(selectedProject.value.id)
    }
  }

  const createProject = async (project: CreateProjectBody) => {
    await api.createProject(project)
    await getUserProjects()
  }

  const replayHooksForProject = async (projectId: string) => {
    await api.replayHooks(projectId)
    await getUserProjects()
  }

  const archiveProject = async (projectId: string) => {
    await api.archiveProject(projectId)
    selectedProject.value = undefined
    await getUserProjects()
  }

  const getProjectSecrets = async (projectId: string) => {
    return await api.getProjectSecrets(projectId)
  }

  const updateProjectRoles = (projectId:string, roles: Role[]) => {
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
