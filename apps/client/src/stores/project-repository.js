import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'

export const useProjectRepositoryStore = defineStore('project-repository', () => {
  const projectStore = useProjectStore()

  const addRepoToProject = async (newRepo) => {
    await api.addRepo(projectStore.selectedProject.id, newRepo)
    await projectStore.getUserProjects()
  }

  const updateRepo = async (repo) => {
    await api.updateRepo(projectStore.selectedProject.id, repo)
    await projectStore.getUserProjects()
  }

  const deleteRepo = async (repoId) => {
    await api.deleteRepo(projectStore.selectedProject.id, repoId)
    await projectStore.getUserProjects()
  }

  return {
    addRepoToProject,
    updateRepo,
    deleteRepo,
  }
})
