import type { ClientInferRequest } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import { RepoSchema } from '../index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const repositoryContract = contractInstance.router({
  createRepository: {
    method: 'POST',
    path: `${apiPrefix}/repositories`,
    contentType: 'application/json',
    summary: 'Create repo',
    description: 'Create new repo.',
    body: RepoSchema.omit({ id: true }),
    responses: {
      201: RepoSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  listRepositories: {
    method: 'GET',
    path: `${apiPrefix}/repositories`,
    summary: 'Get repos',
    description: 'Retrieved all repos.',
    query: z.object({
      projectId: z.string()
        .uuid(),
    }),
    responses: {
      200: z.array(RepoSchema),
      500: ErrorSchema,
    },
  },

  syncRepository: {
    method: 'POST',
    path: `${apiPrefix}/repositories/:repositoryId/sync`,
    summary: 'application/json',
    description: 'Trigger a gitlab synchronization for a repository',
    pathParams: z.object({
      repositoryId: z.string()
        .uuid(),
    }),
    body: z.object({
      syncAllBranches: z.boolean(),
      branchName: z.string().optional(),
    }),
    responses: {
      204: null,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateRepository: {
    method: 'PUT',
    path: `${apiPrefix}/repositories/:repositoryId`,
    summary: 'Update repo',
    description: 'Update a repo by its ID.',
    pathParams: z.object({
      repositoryId: z.string()
        .uuid(),
    }),
    body: RepoSchema.partial(),
    responses: {
      200: RepoSchema,
      500: ErrorSchema,
    },
  },

  deleteRepository: {
    method: 'DELETE',
    path: `${apiPrefix}/repositories/:repositoryId`,
    summary: 'Delete repo',
    description: 'Delete a repo by its ID.',
    body: null,
    pathParams: z.object({
      repositoryId: z.string()
        .uuid(),
    }),
    responses: {
      204: null,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
})

export type CreateRepositoryBody = ClientInferRequest<typeof repositoryContract.createRepository>['body']

export type UpdateRepositoryBody = ClientInferRequest<typeof repositoryContract.updateRepository>['body']

export type SyncRepositoryParams = ClientInferRequest<typeof repositoryContract.syncRepository>['params']

export type RepositoryParams = ClientInferRequest<typeof repositoryContract.updateRepository>['params']
