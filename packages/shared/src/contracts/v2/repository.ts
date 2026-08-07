import type { ClientInferRequest } from '@ts-rest/core'
import { ContractNoBody } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefixV2, contractInstance } from '../../api-client.js'
import { RepoSchema } from '../../schemas/repository.js'
import { CreateRepositorySchema, SyncRepositorySchema, UpdateRepositorySchema } from '../../schemas/v2/repository.js'
import { baseHeaders, ErrorSchema } from '../_utils.js'

// Contrat des dépôts pour l'API v2 (server-nestjs). projectId est porté par le chemin.
// NB: les clés de routes servent d'operationId OpenAPI (setOperationId: true) et
// doivent être uniques sur l'ensemble du contrat, d'où le suffixe V2.
export const repositoryContractV2 = contractInstance.router({
  createRepositoryV2: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Create repository',
    description: 'Create new repository.',
    body: CreateRepositorySchema,
    responses: {
      201: RepoSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  listRepositoriesV2: {
    method: 'GET',
    path: '',
    summary: 'Get repositories',
    description: 'Retrieved all repositories of the project.',
    responses: {
      200: RepoSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateRepositoryV2: {
    method: 'PUT',
    path: '/:repositoryId',
    summary: 'Update repository',
    description: 'Update a repository by its ID.',
    pathParams: z.object({
      repositoryId: z.string()
        .uuid(),
    }),
    body: UpdateRepositorySchema,
    responses: {
      200: RepoSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  syncRepositoryV2: {
    method: 'POST',
    path: '/:repositoryId/sync',
    contentType: 'application/json',
    summary: 'Sync repository',
    description: 'Trigger a GitLab mirror synchronization for a repository.',
    pathParams: z.object({
      repositoryId: z.string()
        .uuid(),
    }),
    body: SyncRepositorySchema,
    responses: {
      204: null,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      422: ErrorSchema,
      500: ErrorSchema,
    },
  },

  deleteRepositoryV2: {
    method: 'DELETE',
    path: '/:repositoryId',
    summary: 'Delete repository',
    description: 'Delete a repository by its ID.',
    body: ContractNoBody,
    pathParams: z.object({
      repositoryId: z.string()
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
  pathPrefix: `${apiPrefixV2}/projects/:projectId/repositories`,
  pathParams: z.object({
    projectId: z.string().uuid(),
  }),
})

// Types de corps de requête : côté appelant ce sont les entrées des schémas
// (avant transformations), d'où leur dérivation du contrat plutôt que de `z.infer`.
export type CreateRepositoryBodyV2 = ClientInferRequest<typeof repositoryContractV2.createRepositoryV2>['body']

export type UpdateRepositoryBodyV2 = ClientInferRequest<typeof repositoryContractV2.updateRepositoryV2>['body']

export type SyncRepositoryBodyV2 = ClientInferRequest<typeof repositoryContractV2.syncRepositoryV2>['body']
