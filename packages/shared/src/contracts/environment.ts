import type { ClientInferRequest } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  EnvironmentSchema,
} from '../schemas/index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const environmentContract = contractInstance.router({
  createEnvironment: {
    method: 'POST',
    path: `${apiPrefix}/environments`,
    contentType: 'application/json',
    summary: 'Create environment',
    description: 'Create new environment.',
    body: EnvironmentSchema.omit({ id: true }),
    responses: {
      201: EnvironmentSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  listEnvironments: {
    method: 'GET',
    path: `${apiPrefix}/environments`,
    summary: 'Get environments',
    description: 'Retrieved project environments.',
    query: z.object({
      projectId: z.string()
        .uuid(),
    }),
    responses: {
      200: EnvironmentSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateEnvironment: {
    method: 'PUT',
    path: `${apiPrefix}/environments/:environmentId`,
    summary: 'Update environment',
    description: 'Update a environment by its ID.',
    pathParams: z.object({
      environmentId: z.string()
        .uuid(),
    }),
    body: EnvironmentSchema.pick({ quotaId: true }),
    responses: {
      200: EnvironmentSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  deleteEnvironment: {
    method: 'DELETE',
    path: `${apiPrefix}/environments/:environmentId`,
    summary: 'Delete environment',
    description: 'Delete a environment by its ID.',
    body: null,
    pathParams: z.object({
      environmentId: z.string()
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
})

export type CreateEnvironmentBody = ClientInferRequest<typeof environmentContract.createEnvironment>['body']
export type UpdateEnvironmentBody = ClientInferRequest<typeof environmentContract.updateEnvironment>['body']
