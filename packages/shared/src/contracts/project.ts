import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateProjectSchema,
  GetProjectsSchema,
  GetProjectSecretsSchema,
  UpdateProjectSchema,
  ReplayHooksForProjectSchema,
  ArchiveProjectSchema,
  PatchProjectSchema,
} from '../schemas/index.js'

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
    path: `${apiPrefix}/projects`,
    summary: 'Get projects',
    description: 'Retrieved user\'s projects.',
    responses: GetProjectsSchema.responses,
  },

  getProjectSecrets: {
    method: 'GET',
    path: `${apiPrefix}/projects/:projectId/secrets`,
    summary: 'Get project secrets',
    description: 'Retrieved a project secrets.',
    pathParams: GetProjectSecretsSchema.params,
    responses: GetProjectSecretsSchema.responses,
  },

  updateProject: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId`,
    summary: 'Update project',
    description: 'Update a project.',
    pathParams: UpdateProjectSchema.params,
    body: UpdateProjectSchema.body,
    responses: UpdateProjectSchema.responses,
  },

  replayHooksForProject: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId/hooks`,
    summary: 'Replay hooks for project',
    description: 'Replay hooks for a project.',
    body: null,
    pathParams: ReplayHooksForProjectSchema.params,
    responses: ReplayHooksForProjectSchema.responses,
  },

  archiveProject: {
    method: 'DELETE',
    path: `${apiPrefix}/projects/:projectId`,
    summary: 'Delete project',
    description: 'Delete a project.',
    pathParams: ArchiveProjectSchema.params,
    body: null,
    responses: ArchiveProjectSchema.responses,
  },
})

export const projectAdminContract = contractInstance.router({
  getAllProjects: {
    method: 'GET',
    path: `${apiPrefix}/admin/projects`,
    summary: 'Get projects',
    description: 'Retrieved all projects.',
    responses: GetProjectsSchema.responses,
  },

  getProjectsData: {
    method: 'GET',
    path: `${apiPrefix}/admin/projects/data`,
    summary: 'Download projects csv report',
    description: 'Retrieve all projects data for download as CSV file.',
    // responses: GetProjectsDataSchema.responses
    responses: {},
  },

  patchProject: {
    method: 'PATCH',
    path: `${apiPrefix}/admin/projects/:projectId`,
    pathParams: PatchProjectSchema.params,
    summary: 'Handle project locking',
    description: 'Lock or unlock a project.',
    body: PatchProjectSchema.body,
    responses: PatchProjectSchema.responses,
  },
})
