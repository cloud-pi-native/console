import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import type { CreateRepositoryDto, RepositoryParams, UpdateRepositoryDto } from '@cpn-console/shared'
import { projectMissing } from '@/utils/const.js'

export const useProjectRepositoryStore = defineStore('project-repository', () => {
  const projectStore = useProjectStore()

  const addRepoToProject = async (newRepo: CreateRepositoryDto) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.addRepo(projectStore.selectedProject.id, newRepo)
    await projectStore.getUserProjects()
  }

  const updateRepo = async (repo: UpdateRepositoryDto) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.updateRepo(projectStore.selectedProject.id, repo)
    await projectStore.getUserProjects()
  }

  const deleteRepo = async (repoId: RepositoryParams['repositoryId']) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.deleteRepo(projectStore.selectedProject.id, repoId)
    await projectStore.getUserProjects()
  }

  return {
    addRepoToProject,
    updateRepo,
    deleteRepo,
  }
})
