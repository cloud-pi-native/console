import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'

export const useProjectRepositoryStore = defineStore('project-repository', () => {
  const addRepoToProject = async (newRepo) => {
    await api.addRepo(useProjectStore.selectedProject.value.id, newRepo)
    await useProjectStore.getUserProjects()
  }

  const deleteRepo = async (repoId) => {
    await api.deleteRepo(useProjectStore.selectedProject.value.id, repoId)
    await useProjectStore.getUserProjects()
  }

  return {
    addRepoToProject,
    deleteRepo,
  }
})
