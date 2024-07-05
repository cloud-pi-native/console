import { defineStore } from 'pinia'
import { useProjectStore } from '@/stores/project.js'
import type { Environment, CreateEnvironmentBody, UpdateEnvironmentBody } from '@cpn-console/shared'
import { projectMissing } from '@/utils/const'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const projectStore = useProjectStore()

  const getProjectEnvironments = async (projectId: string) =>
    apiClient.Environments.getEnvironments({ query: { projectId } })
      .then(response => extractData(response, 200))

  const addEnvironmentToProject = async (body: CreateEnvironmentBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Environments.createEnvironment({ body })
      .then(response => extractData(response, 201))
    await projectStore.getUserProjects()
  }

  const updateEnvironment = async (id: Environment['id'], environment: UpdateEnvironmentBody) => {
    await apiClient.Environments.updateEnvironment({ body: environment, params: { environmentId: id } })
      .then(response => extractData(response, 200))
    await projectStore.getUserProjects()
  }

  const deleteEnvironment = async (environmentId: Environment['id']) => {
    await apiClient.Environments.deleteEnvironment({ params: { environmentId } })
      .then(response => extractData(response, 204))
    await projectStore.getUserProjects()
  }

  return {
    getProjectEnvironments,
    addEnvironmentToProject,
    updateEnvironment,
    deleteEnvironment,
  }
})
