import { ClientInferRequest } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateRepoSchema,
  GetReposSchema,
  UpdateRepoSchema,
  DeleteRepoSchema,
  SyncRepoSchema,
} from '../schemas/index.js'

export const repositoryContract = contractInstance.router({
  createRepository: {
    method: 'POST',
    path: `${apiPrefix}/repositories`,
    contentType: 'application/json',
    summary: 'Create repo',
    description: 'Create new repo.',
    body: CreateRepoSchema.body,
    responses: CreateRepoSchema.responses,
  },

  listRepositories: {
    method: 'GET',
    path: `${apiPrefix}/repositories`,
    query: GetReposSchema.query,
    summary: 'Get repos',
    description: 'Retrieved all repos.',
    responses: GetReposSchema.responses,
  },

  syncRepository: {
    method: 'POST',
    path: `${apiPrefix}/repositories/:repositoryId/sync`,
    body: SyncRepoSchema.body,
    pathParams: SyncRepoSchema.params,
    summary: 'application/json',
    description: 'Trigger a gitlab synchronization for a repository',
    responses: SyncRepoSchema.responses,
  },

  updateRepository: {
    method: 'PUT',
    path: `${apiPrefix}/repositories/:repositoryId`,
    summary: 'Update repo',
    description: 'Update a repo by its ID.',
    pathParams: UpdateRepoSchema.params,
    body: UpdateRepoSchema.body,
    responses: UpdateRepoSchema.responses,
  },

  deleteRepository: {
    method: 'DELETE',
    path: `${apiPrefix}/repositories/:repositoryId`,
    summary: 'Delete repo',
    description: 'Delete a repo by its ID.',
    body: null,
    pathParams: DeleteRepoSchema.params,
    responses: DeleteRepoSchema.responses,
  },
})

export type CreateRepositoryBody = ClientInferRequest<typeof repositoryContract.createRepository>['body']

export type UpdateRepositoryBody = ClientInferRequest<typeof repositoryContract.updateRepository>['body']

export type SyncRepositoryParams = ClientInferRequest<typeof repositoryContract.syncRepository>['params']

export type RepositoryParams = ClientInferRequest<typeof repositoryContract.updateRepository>['params']
