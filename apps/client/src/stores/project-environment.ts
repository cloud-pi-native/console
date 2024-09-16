import type { CreateEnvironmentBody, Environment, UpdateEnvironmentBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { useProjectStore } from '@/stores/project.js'
import { projectMissing } from '@/utils/const.js'
import { defineStore } from 'pinia'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const projectStore = useProjectStore()
  const environments = ref<Environment[]>([])

  const getProjectEnvironments = async (projectId: string) => {
    environments.value = await apiClient.Environments.listEnvironments({ query: { projectId } })
      .then(response => extractData(response, 200))
  }
  const addEnvironmentToProject = async (body: CreateEnvironmentBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Environments.createEnvironment({ body })
      .then(response => extractData(response, 201))
    await getProjectEnvironments(projectStore.selectedProject.id)
  }

  const updateEnvironment = async (id: Environment['id'], environment: UpdateEnvironmentBody) => {
    await apiClient.Environments.updateEnvironment({ body: environment, params: { environmentId: id } })
      .then(response => extractData(response, 200))
    if (projectStore.selectedProject) await getProjectEnvironments(projectStore.selectedProject.id)
  }

  const deleteEnvironment = async (environmentId: Environment['id']) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Environments.deleteEnvironment({ params: { environmentId } })
      .then(response => extractData(response, 204))
    await getProjectEnvironments(projectStore.selectedProject.id)
  }

  return {
    environments,
    getProjectEnvironments,
    addEnvironmentToProject,
    updateEnvironment,
    deleteEnvironment,
  }
})
