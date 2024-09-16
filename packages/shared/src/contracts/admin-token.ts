import { z } from 'zod'
import { AdminTokenSchema, apiPrefix, CoerceBooleanSchema, contractInstance, ExposedAdminTokenSchema } from '../index.js'
import { ErrorSchema } from '../schemas/utils.js'

export const adminTokenContract = contractInstance.router({
  listAdminTokens: {
    method: 'GET',
    path: `${apiPrefix}/admin/tokens`,
    query: z.object({
      withRevoked: z.lazy(() => CoerceBooleanSchema)
        .optional(),
    }),
    responses: {
      200: z.lazy(() => AdminTokenSchema.array()),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  createAdminToken: {
    method: 'POST',
    path: `${apiPrefix}/admin/tokens`,
    body: z.lazy(() => AdminTokenSchema.pick({ name: true, permissions: true, expirationDate: true }).required()),
    responses: {
      201: z.lazy(() => ExposedAdminTokenSchema),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  deleteAdminToken: {
    method: 'DELETE',
    path: `${apiPrefix}/admin/tokens/:tokenId`,
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
})
