import { defineStore } from 'pinia'
import type { CreateEnvironmentBody, Environment, ProjectV2, UpdateEnvironmentBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const environments = ref<Environment[]>([])

  const getProjectEnvironments = async (projectId: string) => {
    environments.value = await apiClient.Environments.listEnvironments({ query: { projectId } })
      .then(response => extractData(response, 200))
    return environments.value
  }
  const addEnvironmentToProject = async (projectId: ProjectV2['id'], body: CreateEnvironmentBody) => {
    await apiClient.Environments.createEnvironment({ body })
      .then(response => extractData(response, 201))
    await getProjectEnvironments(projectId)
    return environments.value
  }

  const updateEnvironment = async (projectId: ProjectV2['id'], id: Environment['id'], environment: UpdateEnvironmentBody) => {
    await apiClient.Environments.updateEnvironment({ body: environment, params: { environmentId: id } })
      .then(response => extractData(response, 200))
    await getProjectEnvironments(projectId)
    return environments.value
  }

  const deleteEnvironment = async (projectId: ProjectV2['id'], environmentId: Environment['id']) => {
    await apiClient.Environments.deleteEnvironment({ params: { environmentId } })
      .then(response => extractData(response, 204))
    await getProjectEnvironments(projectId)
    return environments.value
  }

  return {
    environments,
    getProjectEnvironments,
    addEnvironmentToProject,
    updateEnvironment,
    deleteEnvironment,
  }
})
