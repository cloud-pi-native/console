import type { CreateRepositoryBody, UpdateRepositoryBody, RepositoryParams } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const addRepo = async (projectId: RepositoryParams['projectId'], data: CreateRepositoryBody) => {
  const response = await apiClient.Repositories.createRepository({ body: data, params: { projectId } })
  if (response.status === 201) return response.body
}

export const getRepos = async (projectId: RepositoryParams['projectId']) => {
  const response = await apiClient.Repositories.getRepositories({ params: { projectId } })
  if (response.status === 200) return response.body
}

export const updateRepo = async (projectId: RepositoryParams['projectId'], repositoryId: RepositoryParams['repositoryId'], data: UpdateRepositoryBody) => {
  if (!data.id) return
  const response = await apiClient.Repositories.updateRepository({ body: data, params: { projectId, repositoryId } })
  if (response.status === 200) return response.body
}

export const deleteRepo = async (projectId: RepositoryParams['projectId'], repositoryId: RepositoryParams['repositoryId']) => {
  const response = await apiClient.Repositories.deleteRepository({ params: { projectId, repositoryId } })
  if (response.status === 204) return response.body
}
