import { ClientInferRequest } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateProjectSchema,
  GetProjectsSchema,
  UpdateProjectSchema,
  ReplayHooksForProjectSchema,
  ArchiveProjectSchema,
  PatchProjectSchema,
  GetProjectsDataSchema,
  ProjectSchemaV2,
  ProjectParams,
} from '../schemas/index.js'
import { ErrorSchema } from '../schemas/utils.js'
import { z } from 'zod'

export const projectContract = contractInstance.router({
  createProject: {
    method: 'POST',
    path: `${apiPrefix}/projects`,
    contentType: 'application/json',
    summary: 'Create project',
    description: 'Create a new project.',
    body: CreateProjectSchema.body,
    responses: CreateProjectSchema.responses,
  },

  getProjects: {
    method: 'GET',
    path: `${apiPrefix}/projects/mines`,
    summary: 'Get projects',
    description: 'Retrieved user\'s projects.',
    responses: GetProjectsSchema.responses,
  },

  listProjects: {
    method: 'GET',
    path: `${apiPrefix}/projects`,
    query: GetProjectsSchema.query,
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
    path: `${apiPrefix}/projects/:projectId/secrets`,
    summary: 'Get project secrets',
    description: 'Retrieved a project secrets.',
    pathParams: ProjectParams,
    responses: {
      200: z.record(z.record(z.string())),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateProject: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId`,
    summary: 'Update project',
    description: 'Update a project.',
    pathParams: ProjectParams,
    body: UpdateProjectSchema.body,
    responses: UpdateProjectSchema.responses,
  },

  replayHooksForProject: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId/hooks`,
    summary: 'Replay hooks for project',
    description: 'Replay hooks for a project.',
    body: null,
    pathParams: ProjectParams,
    responses: ReplayHooksForProjectSchema.responses,
  },

  archiveProject: {
    method: 'DELETE',
    path: `${apiPrefix}/projects/:projectId`,
    summary: 'Delete project',
    description: 'Delete a project.',
    pathParams: ProjectParams,
    body: null,
    responses: ArchiveProjectSchema.responses,
  },
})

export type CreateProjectBody = ClientInferRequest<typeof projectContract.createProject>['body']

export type UpdateProjectBody = ClientInferRequest<typeof projectContract.updateProject>['body']

export const projectAdminContract = contractInstance.router({
  getProjectsData: {
    method: 'GET',
    path: `${apiPrefix}/admin/projects/data`,
    summary: 'Download projects csv report',
    description: 'Retrieve all projects data for download as CSV file.',
    responses: GetProjectsDataSchema.responses,
  },

  patchProject: {
    method: 'PATCH',
    path: `${apiPrefix}/admin/projects/:projectId`,
    pathParams: ProjectParams,
    summary: 'Handle project locking',
    description: 'Lock or unlock a project.',
    body: PatchProjectSchema.body,
    responses: PatchProjectSchema.responses,
  },
})

export type PatchProjectBody = ClientInferRequest<typeof projectAdminContract.patchProject>['body']
