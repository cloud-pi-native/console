import { z } from 'zod'
import { RoleSchema, apiPrefix, contractInstance } from '../index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const projectRoleContract = contractInstance.router({
  listProjectRoles: {
    method: 'GET',
    path: '',
    pathParams: z.object({ projectId: z.string().uuid() }),
    responses: {
      200: RoleSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },
  createProjectRole: {
    method: 'POST',
    path: '',
    body: RoleSchema.omit({ position: true, id: true }),
    pathParams: z.object({ projectId: z.string().uuid() }),
    responses: {
      // 200: z.any(),
      200: RoleSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },
  patchProjectRoles: {
    method: 'PATCH',
    path: '',
    pathParams: z.object({ projectId: z.string().uuid() }),
    // body: z.any(),
    body: RoleSchema.partial({ name: true, permissions: true, position: true }).array(),
    responses: {
      // 200: z.any(),
      200: RoleSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },
  projectRoleMemberCounts: {
    method: 'GET',
    path: `/member-counts`,
    pathParams: z.object({ projectId: z.string().uuid() }),
    responses: {
      200: z.record(z.number().min(0)), // Record<role uuid, number of member>
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },
  deleteProjectRole: {
    method: 'DELETE',
    path: `/:roleId`,
    pathParams: z.object({
      projectId: z.string().uuid(),
      roleId: z.string().uuid(),
    }),
    body: null,
    responses: {
      204: null,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/projects/:projectId/roles`,
})
