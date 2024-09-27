import { z } from 'zod'
import { AdminTokenSchema, ExposedAdminTokenSchema, apiPrefix, contractInstance } from '../index.js'
import { CoerceBooleanSchema } from '../schemas/_utils.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const adminTokenContract = contractInstance.router({
  listAdminTokens: {
    method: 'GET',
    path: '',
    query: z.object({
      withRevoked: CoerceBooleanSchema
        .optional(),
    }),
    responses: {
      200: AdminTokenSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  createAdminToken: {
    method: 'POST',
    path: '',
    body: AdminTokenSchema.pick({ name: true, permissions: true, expirationDate: true }).required(),
    responses: {
      201: ExposedAdminTokenSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  deleteAdminToken: {
    method: 'DELETE',
    path: `/:tokenId`,
    pathParams: z.object({ tokenId: z.string().uuid() }),
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
  pathPrefix: `${apiPrefix}/admin/tokens`,
})
