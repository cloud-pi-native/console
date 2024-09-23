import { z } from 'zod'
import { AdminRoleSchema, apiPrefix, contractInstance } from '../index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const adminRoleContract = contractInstance.router({
  listAdminRoles: {
    method: 'GET',
    path: `${apiPrefix}/admin/roles`,
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
    path: `${apiPrefix}/admin/roles`,
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
    path: `${apiPrefix}/admin/roles`,
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
    path: `${apiPrefix}/admin/roles/member-counts`,
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
    path: `${apiPrefix}/admin/roles/:roleId`,
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
})
