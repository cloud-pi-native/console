import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateRepoSchema,
  GetReposSchema,
  GetRepoByIdSchema,
  UpdateRepoSchema,
  DeleteRepoSchema,
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
