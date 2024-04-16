import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import type { Environment, CreateEnvironmentBody, Project, UpdateEnvironmentBody } from '@cpn-console/shared'
import { projectMissing } from '@/utils/const'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const projectStore = useProjectStore()

  const addEnvironmentToProject = async (newEnvironment: CreateEnvironmentBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.addEnvironment(projectStore.selectedProject.id, newEnvironment)
    await projectStore.getUserProjects()
  }

  const updateEnvironment = async (environment: UpdateEnvironmentBody, projectId: Project['id']) => {
    // @ts-ignore
    await api.updateEnvironment(projectId, environment?.id, environment)
    await projectStore.getUserProjects()
  }

  const deleteEnvironment = async (environmentId: Environment['id']) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.deleteEnvironment(projectStore.selectedProject.id, environmentId)
    await projectStore.getUserProjects()
  }

  const getQuotas = async () => {
    return api.getQuotas()
  }

  const getStages = async () => {
    return api.getStages()
  }

  return {
    addEnvironmentToProject,
    updateEnvironment,
    deleteEnvironment,
    getQuotas,
    getStages,
  }
})
