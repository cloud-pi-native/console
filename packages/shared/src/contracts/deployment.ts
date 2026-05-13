import type { ClientInferRequest } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateDeploymentSchema,
  DeploymentSchema,
  UpdateDeploymentSchema,
} from '../schemas/index.js'
import { baseHeaders, ErrorSchema } from './_utils.js'

export const deploymentContract = contractInstance.router({
  createDeployment: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Create deployment',
    description: 'Create new deployment.',
    body: CreateDeploymentSchema,
    responses: {
      201: DeploymentSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  listDeployments: {
    method: 'GET',
    path: '',
    summary: 'Get deployments',
    description: 'Retrieved project deployments.',
    query: z.object({
      projectId: z.string()
        .uuid(),
    }),
    responses: {
      200: DeploymentSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateDeployment: {
    method: 'PUT',
    path: `/:deploymentId`,
    summary: 'Update deployment',
    description: 'Update a deployment by its ID.',
    pathParams: z.object({
      deploymentId: z.string()
        .uuid(),
    }),
    body: UpdateDeploymentSchema,
    responses: {
      200: DeploymentSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  deleteDeployment: {
    method: 'DELETE',
    path: `/:deploymentId`,
    summary: 'Delete deployment',
    description: 'Delete a deployment by its ID.',
    body: null,
    pathParams: z.object({
      deploymentId: z.string()
        .uuid(),
    }),
    responses: {
      204: null,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/deployments`,
})

export type CreateDeploymentBody = ClientInferRequest<typeof deploymentContract.createDeployment>['body']
export type UpdateDeploymentBody = ClientInferRequest<typeof deploymentContract.updateDeployment>['body']
