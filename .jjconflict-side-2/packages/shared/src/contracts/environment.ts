import type { ClientInferRequest } from '@ts-rest/core'
import { ContractNoBody } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, apiPrefixV2, contractInstance } from '../api-client.js'
import {
  CreateEnvironmentSchema,
  EnvironmentSchema,
  UpdateEnvironmentSchema,
} from '../schemas/index.js'
import { baseHeaders, ErrorSchema } from './_utils.js'

export const environmentContract = contractInstance.router({
  createEnvironment: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Create environment',
    description: 'Create new environment.',
    body: EnvironmentSchema.omit({ id: true, createdAt: true, updatedAt: true }),
    responses: {
      201: EnvironmentSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  listEnvironments: {
    method: 'GET',
    path: '',
    summary: 'Get environments',
    description: 'Retrieved project environments.',
    query: z.object({
      projectId: z.string()
        .uuid(),
    }),
    responses: {
      200: EnvironmentSchema.omit({ name: true })
        .extend({ name: z.string() }).array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateEnvironment: {
    method: 'PUT',
    path: `/:environmentId`,
    summary: 'Update environment',
    description: 'Update a environment by its ID.',
    pathParams: z.object({
      environmentId: z.string()
        .uuid(),
    }),
    body: EnvironmentSchema.pick({ cpu: true, gpu: true, memory: true, autosync: true }),
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
    path: `/:environmentId`,
    summary: 'Delete environment',
    description: 'Delete a environment by its ID.',
    body: ContractNoBody,
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
  pathPrefix: `${apiPrefix}/environments`,
})

export type CreateEnvironmentBody = ClientInferRequest<typeof environmentContract.createEnvironment>['body']
export type UpdateEnvironmentBody = ClientInferRequest<typeof environmentContract.updateEnvironment>['body']

// NB: les clés de routes servent d'operationId OpenAPI (setOperationId: true) et
// doivent être uniques sur l'ensemble du contrat, d'où le suffixe V2.
export const environmentContractV2 = contractInstance.router({
  createEnvironmentV2: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Create environment',
    description: 'Create new environment.',
    body: CreateEnvironmentSchema,
    responses: {
      201: EnvironmentSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  listEnvironmentsV2: {
    method: 'GET',
    path: '',
    summary: 'Get environments',
    description: 'Retrieved project environments.',
    responses: {
      200: EnvironmentSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateEnvironmentV2: {
    method: 'PUT',
    path: '/:environmentId',
    summary: 'Update environment',
    description: 'Update an environment by its ID.',
    pathParams: z.object({
      environmentId: z.string()
        .uuid(),
    }),
    body: UpdateEnvironmentSchema,
    responses: {
      200: EnvironmentSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  deleteEnvironmentV2: {
    method: 'DELETE',
    path: '/:environmentId',
    summary: 'Delete environment',
    description: 'Delete an environment by its ID.',
    body: ContractNoBody,
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
  pathPrefix: `${apiPrefixV2}/projects/:projectId/environments`,
  pathParams: z.object({
    projectId: z.string().uuid(),
  }),
})
