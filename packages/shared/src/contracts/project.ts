import type { ClientInferRequest } from '@ts-rest/core'
import { z } from 'zod'
import { contractInstance } from '../api-client.js'
import {
  ProjectSchemaV2,
  apiPrefix,
} from '../index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const ProjectParams = z.object({
  projectId: z.string().regex(/[a-z0-9-]*/), // uuid or slug like
})

export const projectContract = contractInstance.router({
  createProject: {
    method: 'POST',
    path: '',
    contentType: 'application/json',
    summary: 'Create project',
    description: 'Create a new project.',
    body: ProjectSchemaV2.pick({ name: true, organizationId: true, description: true }),
    responses: {
      201: ProjectSchemaV2.omit({ name: true }).extend({ name: z.string() }),
      400: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  bulkActionProject: {
    method: 'POST',
    path: '-bulk',
    contentType: 'application/json',
    summary: 'Perform bulk action on projects',
    description: 'Perform bulk action on projects.',
    body: z.object({
      action: z.enum(['archive', 'lock', 'unlock', 'replay']),
      projectIds: z.string().uuid().array().or(z.literal('all')),
    }),
    responses: {
      202: null,
      400: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  getProject: {
    method: 'GET',
    path: '/:projectId',
    pathParams: ProjectParams,
    summary: 'Get a project',
    description: 'Get a project',
    responses: {
      200: ProjectSchemaV2.omit({ name: true }).extend({ name: z.string() }),
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  listProjects: {
    method: 'GET',
    path: '',
    query: ProjectSchemaV2
      .pick({
        id: true,
        name: true,
        status: true,
        locked: true,
        organizationId: true,
        description: true,
        lastSuccessProvisionningVersion: true,
      })
      .extend({
        statusIn: z.string(),
        statusNotIn: z.string(),
        filter: z.enum(['owned', 'member', 'all']),
        organizationName: z.string(),
        search: z.string(),
      })
      .partial(),
    summary: 'Get projects',
    description: 'Get projects with filters',
    responses: {
      200: ProjectSchemaV2.omit({ name: true }).extend({ name: z.string() }).array(),
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  getProjectSecrets: {
    method: 'GET',
    path: `/:projectId/secrets`,
    summary: 'Get project secrets',
    description: 'Retrieved a project secrets.',
    pathParams: ProjectParams,
    responses: {
      200: z.record(z.record(z.string())),
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateProject: {
    method: 'PUT',
    path: `/:projectId`,
    summary: 'Update project',
    description: 'Update a project.',
    pathParams: ProjectParams,
    body: ProjectSchemaV2
      .pick({
        description: true,
        everyonePerms: true,
        locked: true,
        ownerId: true,
      })
      .partial(),
    responses: {
      200: ProjectSchemaV2.omit({ name: true }).extend({ name: z.string() }),
      500: ErrorSchema,
    },
  },

  replayHooksForProject: {
    method: 'PUT',
    path: `/:projectId/hooks`,
    summary: 'Replay hooks for project',
    description: 'Replay hooks for a project.',
    body: null,
    pathParams: ProjectParams,
    responses: {
      204: null,
      500: ErrorSchema,
    },
  },

  archiveProject: {
    method: 'DELETE',
    path: `/:projectId`,
    summary: 'Delete project',
    description: 'Delete a project.',
    pathParams: ProjectParams,
    body: null,
    responses: {
      204: null,
      500: ErrorSchema,
    },
  },

  getProjectsData: {
    method: 'GET',
    path: `/data`,
    summary: 'Download projects csv report',
    description: 'Retrieve all projects data for download as CSV file.',
    responses: {
      200: z.string(),
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/projects`,
})

export type CreateProjectBody = ClientInferRequest<typeof projectContract.createProject>['body']
