import { ClientInferRequest } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateRepoSchema,
  GetReposSchema,
  GetRepoByIdSchema,
  UpdateRepoSchema,
  DeleteRepoSchema,
  SyncRepoSchema,
} from '../schemas/index.js'

export const repositoryContract = contractInstance.router({
  createRepository: {
    method: 'POST',
    path: `${apiPrefix}/projects/:projectId/repositories`,
    pathParams: CreateRepoSchema.params,
    contentType: 'application/json',
    summary: 'Create repo',
    description: 'Create new repo.',
    body: CreateRepoSchema.body,
    responses: CreateRepoSchema.responses,
  },

  getRepositories: {
    method: 'GET',
    path: `${apiPrefix}/projects/:projectId/repositories`,
    pathParams: GetReposSchema.params,
    summary: 'Get repos',
    description: 'Retrieved all repos.',
    responses: GetReposSchema.responses,
  },

  getRepositoryById: {
    method: 'GET',
    path: `${apiPrefix}/projects/:projectId/repositories/:repositoryId`,
    summary: 'Get repo',
    description: 'Retrieved a repo by its ID.',
    pathParams: GetRepoByIdSchema.params,
    responses: GetRepoByIdSchema.responses,
  },

  syncRepository: {
    method: 'POST',
    path: `${apiPrefix}/projects/:projectId/repositories/:repositoryId/sync`,
    body: SyncRepoSchema.body,
    pathParams: SyncRepoSchema.params,
    summary: 'application/json',
    description: 'Trigger a gitlab synchronization for a repository',
    responses: SyncRepoSchema.responses,
  },

  updateRepository: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId/repositories/:repositoryId`,
    summary: 'Update repo',
    description: 'Update a repo by its ID.',
    pathParams: UpdateRepoSchema.params,
    body: UpdateRepoSchema.body,
    responses: UpdateRepoSchema.responses,
  },

  deleteRepository: {
    method: 'DELETE',
    path: `${apiPrefix}/projects/:projectId/repositories/:repositoryId`,
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
