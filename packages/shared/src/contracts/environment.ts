import { ClientInferRequest } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateEnvironmentSchema,
  UpdateEnvironmentSchema,
  DeleteEnvironmentSchema,
  GetEnvironmentsSchema,
} from '../schemas/index.js'

export const environmentContract = contractInstance.router({
  createEnvironment: {
    method: 'POST',
    path: `${apiPrefix}/environments`,
    contentType: 'application/json',
    summary: 'Create environment',
    description: 'Create new environment.',
    body: CreateEnvironmentSchema.body,
    responses: CreateEnvironmentSchema.responses,
  },

  listEnvironments: {
    method: 'GET',
    path: `${apiPrefix}/environments`,
    summary: 'Get environments',
    description: 'Retrieved project environments.',
    query: GetEnvironmentsSchema.query,
    responses: GetEnvironmentsSchema.responses,
  },

  updateEnvironment: {
    method: 'PUT',
    path: `${apiPrefix}/environments/:environmentId`,
    summary: 'Update environment',
    description: 'Update a environment by its ID.',
    pathParams: UpdateEnvironmentSchema.params,
    body: UpdateEnvironmentSchema.body,
    responses: UpdateEnvironmentSchema.responses,
  },

  deleteEnvironment: {
    method: 'DELETE',
    path: `${apiPrefix}/environments/:environmentId`,
    summary: 'Delete environment',
    description: 'Delete a environment by its ID.',
    pathParams: DeleteEnvironmentSchema.params,
    body: null,
    responses: DeleteEnvironmentSchema.responses,
  },
})

export type CreateEnvironmentBody = ClientInferRequest<typeof environmentContract.createEnvironment>['body']

export type UpdateEnvironmentBody = ClientInferRequest<typeof environmentContract.updateEnvironment>['body']
