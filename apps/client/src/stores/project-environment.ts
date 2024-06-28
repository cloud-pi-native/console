import { defineStore } from 'pinia'
import { useProjectStore } from '@/stores/project.js'
import type { Environment, CreateEnvironmentBody, Project, UpdateEnvironmentBody } from '@cpn-console/shared'
import { projectMissing } from '@/utils/const'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const projectStore = useProjectStore()

  const getProjectEnvironments = async (projectId: string) =>
    apiClient.Environments.getEnvironments({ params: { projectId } })
      .then(response => extractData(response, 200))

  const addEnvironmentToProject = async (body: CreateEnvironmentBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Environments.createEnvironment({ body, params: { projectId: projectStore.selectedProject.id } })
      .then(response => extractData(response, 201))
    await projectStore.getUserProjects()
  }

  const updateEnvironment = async (environment: UpdateEnvironmentBody & { id: Environment['id'] }, projectId: Project['id']) => {
    await apiClient.Environments.updateEnvironment({ body: environment, params: { projectId, environmentId: environment.id } })
      .then(response => extractData(response, 200))
    await projectStore.getUserProjects()
  }

  const deleteEnvironment = async (environmentId: Environment['id']) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Environments.deleteEnvironment({ params: { projectId: projectStore.selectedProject.id, environmentId } })
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
