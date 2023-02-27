import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'

export const useProjectEnvironmentStore = defineStore('project-environment', () => {
  const addEnvironmentToProject = async (newEnvironment) => {
    await api.addEnvironment(useProjectStore.selectedProject.value.id, newEnvironment)
    await useProjectStore.getUserProjects()
  }

  const deleteEnvironment = async (environmentId) => {
    await api.deleteEnvironment(useProjectStore.selectedProject.value.id, environmentId)
    await useProjectStore.getUserProjects()
  }

  return {
    addEnvironmentToProject,
    deleteEnvironment,
  }
})
