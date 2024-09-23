import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import { ProjectParams, ServiceSchema, permissionTarget, pluginUpdateBody } from '../index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const projectServiceContract = contractInstance.router({
  getServices: {
    method: 'GET',
    path: `${apiPrefix}/project/:projectId/services`,
    summary: 'Get Project\'s services',
    description: 'Get all informations about services related to a project.',
    query: z.object({ permissionTarget }),
    pathParams: ProjectParams,
    responses: {
      200: ServiceSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },

  updateProjectServices: {
    method: 'POST',
    path: `${apiPrefix}/project/:projectId/services`,
    summary: 'Update project service configuration',
    description: 'Update project service configuration',
    pathParams: ProjectParams,
    body: pluginUpdateBody,
    responses: {
      204: null,
      400: ErrorSchema,
      401: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
})
