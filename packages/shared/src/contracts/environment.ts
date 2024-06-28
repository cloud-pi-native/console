import { ClientInferRequest } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateEnvironmentSchema,
  // GetEnvironmentByIdSchema,
  UpdateEnvironmentSchema,
  DeleteEnvironmentSchema,
  GetEnvironmentsSchema,
} from '../schemas/index.js'

export const environmentContract = contractInstance.router({
  createEnvironment: {
    method: 'POST',
    path: `${apiPrefix}/projects/:projectId/environments`,
    contentType: 'application/json',
    summary: 'Create environment',
    description: 'Create new environment.',
    pathParams: CreateEnvironmentSchema.params,
    body: CreateEnvironmentSchema.body,
    responses: CreateEnvironmentSchema.responses,
  },

  getEnvironments: {
    method: 'GET',
    path: `${apiPrefix}/projects/:projectId/environments`,
    summary: 'Get environments',
    description: 'Retrieved project environments.',
    pathParams: GetEnvironmentsSchema.params,
    responses: GetEnvironmentsSchema.responses,
  },

  // getEnvironmentById: {
  //   method: 'GET',
  //   path: `${apiPrefix}/projects/:projectId/environments/:environmentId`,
  //   summary: 'Get environment',
  //   description: 'Retrieved a environment by its ID.',
  //   pathParams: GetEnvironmentByIdSchema.params,
  //   responses: GetEnvironmentByIdSchema.responses,
  // },

  updateEnvironment: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId/environments/:environmentId`,
    summary: 'Update environment',
    description: 'Update a environment by its ID.',
    pathParams: UpdateEnvironmentSchema.params,
    body: UpdateEnvironmentSchema.body,
    responses: UpdateEnvironmentSchema.responses,
  },

  deleteEnvironment: {
    method: 'DELETE',
    path: `${apiPrefix}/projects/:projectId/environments/:environmentId`,
    summary: 'Delete environment',
    description: 'Delete a environment by its ID.',
    pathParams: DeleteEnvironmentSchema.params,
    body: null,
    responses: DeleteEnvironmentSchema.responses,
  },
})

export type CreateEnvironmentBody = ClientInferRequest<typeof environmentContract.createEnvironment>['body']

export type UpdateEnvironmentBody = ClientInferRequest<typeof environmentContract.updateEnvironment>['body']
