import { z } from 'zod'
import { AdminRoleSchema, apiPrefix, contractInstance } from '../index'
import { ErrorSchema, baseHeaders } from './_utils'

export const adminRoleContract = contractInstance.router({
  listAdminRoles: {
    method: 'GET',
    path: '',
    responses: {
      200: AdminRoleSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  createAdminRole: {
    method: 'POST',
    path: '',
    body: AdminRoleSchema.pick({ name: true }),
    responses: {
      200: AdminRoleSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  patchAdminRoles: {
    method: 'PATCH',
    path: '',
    body: AdminRoleSchema.partial({ name: true, permissions: true, position: true, oidcGroup: true }).array(),
    responses: {
      200: AdminRoleSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  adminRoleMemberCounts: {
    method: 'GET',
    path: `/member-counts`,
    responses: {
      200: z.record(z.number().min(0)), // Record<role uuid, number of member>
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  deleteAdminRole: {
    method: 'DELETE',
    path: `/:roleId`,
    pathParams: z.object({
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
  pathPrefix: `${apiPrefix}/admin/roles`,
})
