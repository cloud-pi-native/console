import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const projectStore = useProjectStore()

  const addEnvironmentToProject = async (newEnvironment) => {
    await api.addEnvironment(projectStore.selectedProject.id, newEnvironment)
    await projectStore.getUserProjects()
  }

  const deleteEnvironment = async (environmentId) => {
    await api.deleteEnvironment(projectStore.selectedProject.id, environmentId)
    await projectStore.getUserProjects()
  }

  return {
    addEnvironmentToProject,
    deleteEnvironment,
  }
})
