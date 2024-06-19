import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import type { Environment, CreateEnvironmentBody, Project, UpdateEnvironmentBody } from '@cpn-console/shared'
import { projectMissing } from '@/utils/const'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const projectStore = useProjectStore()

  const getProjectEnvironments = async (projectId: string) => api.getEnvironments(projectId)

  const addEnvironmentToProject = async (newEnvironment: CreateEnvironmentBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.addEnvironment(projectStore.selectedProject.id, newEnvironment)
    await projectStore.getUserProjects()
  }

  const updateEnvironment = async (id: Environment['id'], projectId: Project['id'], environment: UpdateEnvironmentBody) => {
    await api.updateEnvironment(projectId, id, environment)
    await projectStore.getUserProjects()
  }

  const deleteEnvironment = async (environmentId: Environment['id']) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.deleteEnvironment(projectStore.selectedProject.id, environmentId)
    await projectStore.getUserProjects()
  }

  const getQuotas = async () => api.getQuotas()

  const getStages = async () => api.getStages()

  return {
    getProjectEnvironments,
    addEnvironmentToProject,
    updateEnvironment,
    deleteEnvironment,
    getQuotas,
    getStages,
  }
})
