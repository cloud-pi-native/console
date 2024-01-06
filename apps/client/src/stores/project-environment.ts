import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import { projectMissing } from '@/utils/const'
import { apiClient } from '@/api/xhr-client.js'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const projectStore = useProjectStore()

  const addEnvironmentToProject = async (newEnvironment: Parameters<typeof apiClient.v1ProjectsEnvironmentsCreate>[1]) => {
    if (!projectStore.selectedProject?.id) throw new Error(projectMissing)
    await apiClient.v1ProjectsEnvironmentsCreate(projectStore.selectedProject.id, newEnvironment)
    await projectStore.getUserProjects()
  }

  const updateEnvironment = async (
    projectId: Parameters <typeof apiClient.v1ProjectsEnvironmentsUpdate>[0],
    id: Parameters<typeof apiClient.v1ProjectsEnvironmentsUpdate>[1],
    data: Parameters<typeof apiClient.v1ProjectsEnvironmentsUpdate>[2],

  ) => {
    await apiClient.v1ProjectsEnvironmentsUpdate(projectId, id, data)
    await projectStore.getUserProjects()
  }

  const deleteEnvironment = async (
    environmentId:Parameters<typeof apiClient.v1ProjectsEnvironmentsDelete>[1],
  ) => {
    if (!projectStore.selectedProject?.id) throw new Error(projectMissing)
    await apiClient.v1ProjectsEnvironmentsDelete(projectStore.selectedProject.id, environmentId)
    await api.deleteEnvironment(projectStore.selectedProject.id, environmentId)
    await projectStore.getUserProjects()
  }

  const getQuotas = async () => apiClient.v1QuotasList()

  const getStages = async () => apiClient.v1StagesList()

  return {
    addEnvironmentToProject,
    updateEnvironment,
    deleteEnvironment,
    getQuotas,
    getStages,
  }
})
