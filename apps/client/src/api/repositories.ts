import type { CreateRepositoryBody, UpdateRepositoryBody, SyncRepositoryParams, RepositoryParams } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const addRepo = (projectId: RepositoryParams['projectId'], data: CreateRepositoryBody) =>
  apiClient.Repositories.createRepository({ body: data, params: { projectId } })
    .then(response => extractData(response, 201))

export const getRepos = (projectId: RepositoryParams['projectId']) =>
  apiClient.Repositories.getRepositories({ params: { projectId } })
    .then(response => extractData(response, 200))

export const syncRepository = (
  projectId: SyncRepositoryParams['projectId'],
  repositoryId: SyncRepositoryParams['repositoryId'],
  branchName: SyncRepositoryParams['branchName'],
) =>
  apiClient.Repositories.syncRepository({ params: { projectId, repositoryId, branchName } })
    .then(response => extractData(response, 204))

export const updateRepo = (projectId: RepositoryParams['projectId'], repositoryId: RepositoryParams['repositoryId'], data: UpdateRepositoryBody) =>
  apiClient.Repositories.updateRepository({ body: data, params: { projectId, repositoryId } })
    .then(response => extractData(response, 200))

export const deleteRepo = (projectId: RepositoryParams['projectId'], repositoryId: RepositoryParams['repositoryId']) =>
  apiClient.Repositories.deleteRepository({ params: { projectId, repositoryId } })
    .then(response => extractData(response, 204))
