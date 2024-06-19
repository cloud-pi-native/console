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

  const updateEnvironment = async (environment: UpdateEnvironmentBody & { id: Environment['id'] }, projectId: Project['id']) => {
    await api.updateEnvironment(projectId, environment?.id, environment)
    await projectStore.getUserProjects()
  }

  const deleteEnvironment = async (environmentId: Environment['id']) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.deleteEnvironment(projectStore.selectedProject.id, environmentId)
    await projectStore.getUserProjects()
  }

  const getQuotas = async () => {
    const res = await api.getQuotas()
    if (!res) return []
    return res
  }

  const getStages = async () => {
    const res = await api.getStages()
    if (!res) return []
    return res
  }

  return {
    getProjectEnvironments,
    addEnvironmentToProject,
    updateEnvironment,
    deleteEnvironment,
    getQuotas,
    getStages,
  }
})
