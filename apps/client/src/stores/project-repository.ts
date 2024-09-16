import type { CreateRepositoryBody, Repo, RepositoryParams, UpdateRepositoryBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { useProjectStore } from '@/stores/project.js'
import { projectMissing } from '@/utils/const.js'
import { defineStore } from 'pinia'

export const useProjectRepositoryStore = defineStore('project-repository', () => {
  const projectStore = useProjectStore()
  const repositories = ref<Repo[]>([])

  const getProjectRepositories = async (projectId: string) => {
    repositories.value = await apiClient.Repositories.listRepositories({ query: { projectId } })
      .then(response => extractData(response, 200))
  }

  const syncRepository = async (repositoryId: string, { branchName, syncAllBranches = false }: { branchName?: string, syncAllBranches?: boolean }) => {
    await apiClient.Repositories.syncRepository({
      params: { repositoryId },
      body: { branchName, syncAllBranches },
    })
      .then(response => extractData(response, 204))
  }

  const addRepoToProject = async (body: CreateRepositoryBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Repositories.createRepository({ body })
      .then(response => extractData(response, 201))
    await getProjectRepositories(projectStore.selectedProject.id)
  }

  const updateRepo = async (body: UpdateRepositoryBody & { id: RepositoryParams['repositoryId'] }) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Repositories.updateRepository({ body, params: { repositoryId: body.id } })
      .then(response => extractData(response, 200))
    await getProjectRepositories(projectStore.selectedProject.id)
  }

  const deleteRepo = async (repositoryId: string) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Repositories.deleteRepository({ params: { repositoryId } })
      .then(response => extractData(response, 204))
    await getProjectRepositories(projectStore.selectedProject.id)
  }

  return {
    repositories,
    getProjectRepositories,
    addRepoToProject,
    updateRepo,
    deleteRepo,
    syncRepository,
  }
})
