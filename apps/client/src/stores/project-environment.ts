import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import type { EnvironmentModel, InitializeEnvironmentDto, UpdateEnvironmentDto } from '@dso-console/shared'
import { projectMissing } from '@/utils/const'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const projectStore = useProjectStore()

  const addEnvironmentToProject = async (newEnvironment: InitializeEnvironmentDto['body']) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.addEnvironment(projectStore.selectedProject.id, newEnvironment)
    await projectStore.getUserProjects()
  }

  const updateEnvironment = async (environment: UpdateEnvironmentDto['body'] & { id: EnvironmentModel['id']}) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.updateEnvironment(projectStore.selectedProject.id, environment.id, environment)
    await projectStore.getUserProjects()
  }

  const deleteEnvironment = async (environmentId: EnvironmentModel['id']) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.deleteEnvironment(projectStore.selectedProject.id, environmentId)
    await projectStore.getUserProjects()
  }

  const getQuotas = async () => {
    return api.getQuotas()
  }

  const getDsoEnvironments = async () => {
    return api.getDsoEnvironments()
  }

  return {
    addEnvironmentToProject,
    updateEnvironment,
    deleteEnvironment,
    getQuotas,
    getDsoEnvironments,
  }
})
