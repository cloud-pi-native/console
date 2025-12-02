import type { ClientInferRequest } from '@ts-rest/core'
import { z } from 'zod'
import { contractInstance } from '../api-client.js'
import { RepoSchema, apiPrefix } from '../index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const repositoryContract = contractInstance.router({
  createRepository: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Create repo',
    description: 'Create new repo.',
    body: RepoSchema.omit({ id: true, createdAt: true, updatedAt: true }),
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
    path: '',
    summary: 'Get repos',
    description: 'Retrieved all repos.',
    query: z.object({
      projectId: z.string()
        .uuid(),
    }),
    responses: {
      200: z.array(RepoSchema
        .omit({ internalRepoName: true })
        .extend({ internalRepoName: z.string() }),
      ),
      500: ErrorSchema,
    },
  },

  syncRepository: {
    method: 'POST',
    path: `/:repositoryId/sync`,
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

  autoSyncRepositories: {
    method: 'POST',
    path: `/sync`,
    summary: 'Update auto synced repos',
    description: 'Update all repo marked for auto sync.',
    body: null,
    responses: {
      204: null,
      500: ErrorSchema,
    },
  },

  updateRepository: {
    method: 'PUT',
    path: `/:repositoryId`,
    summary: 'Update repo',
    description: 'Update a repo by its ID.',
    pathParams: z.object({
      repositoryId: z.string()
        .uuid(),
    }),
    body: RepoSchema.omit({ createdAt: true, updatedAt: true }).partial(),
    responses: {
      200: RepoSchema,
      500: ErrorSchema,
    },
  },

  deleteRepository: {
    method: 'DELETE',
    path: `/:repositoryId`,
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
  pathPrefix: `${apiPrefix}/repositories`,
})

export type CreateRepositoryBody = ClientInferRequest<typeof repositoryContract.createRepository>['body']

export type UpdateRepositoryBody = ClientInferRequest<typeof repositoryContract.updateRepository>['body']

export type SyncRepositoryParams = ClientInferRequest<typeof repositoryContract.syncRepository>['params']

export type RepositoryParams = ClientInferRequest<typeof repositoryContract.updateRepository>['params']
