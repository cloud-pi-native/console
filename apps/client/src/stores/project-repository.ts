import { defineStore } from 'pinia'
import type { CreateRepositoryBody, ProjectV2, Repo, RepositoryParams, UpdateRepositoryBody } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectRepositoryStore = defineStore('project-repository', () => {
  const repositories = ref<Repo[]>([])

  const getProjectRepositories = async (projectId: string) => {
    repositories.value = await apiClient.Repositories.listRepositories({ query: { projectId } })
      .then(response => extractData(response, 200))
    return repositories.value
  }

  const syncRepository = async (repositoryId: string, { branchName, syncAllBranches = false }: { branchName?: string, syncAllBranches?: boolean }) => {
    await apiClient.Repositories.syncRepository({
      params: { repositoryId },
      body: { branchName, syncAllBranches },
    })
      .then(response => extractData(response, 204))
  }

  const addRepoToProject = async (projectId: ProjectV2['id'], body: CreateRepositoryBody) => {
    await apiClient.Repositories.createRepository({ body })
      .then(response => extractData(response, 201))
    await getProjectRepositories(projectId)
  }

  const updateRepo = async (projectId: ProjectV2['id'], body: UpdateRepositoryBody & { id: RepositoryParams['repositoryId'] }) => {
    await apiClient.Repositories.updateRepository({ body, params: { repositoryId: body.id } })
      .then(response => extractData(response, 200))
    await getProjectRepositories(projectId)
  }

  const deleteRepo = async (projectId: ProjectV2['id'], repositoryId: string) => {
    await apiClient.Repositories.deleteRepository({ params: { repositoryId } })
      .then(response => extractData(response, 204))
    await getProjectRepositories(projectId)
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
