import { apiPrefix, contractInstance } from '../api-client.js'
import {
  GetProjectServicesSchema,
  UpdateProjectServicesSchema,
} from '../schemas/index.js'

export const projectServiceContract = contractInstance.router({
  getServices: {
    method: 'GET',
    path: `${apiPrefix}/project/:projectId/services`,
    summary: 'Get Project\'s services',
    description: 'Get all informations about services related to a project.',
    query: GetProjectServicesSchema.query,
    pathParams: GetProjectServicesSchema.params,
    responses: GetProjectServicesSchema.responses,
  },

  updateProjectServices: {
    method: 'POST',
    path: `${apiPrefix}/project/:projectId/services`,
    summary: 'Update project service configuration',
    description: 'Update project service configuration',
    pathParams: UpdateProjectServicesSchema.params,
    body: UpdateProjectServicesSchema.body,
    responses: UpdateProjectServicesSchema.responses,
  },
})
