import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import { ExposedPersonalAccessTokenSchema, PersonalAccessTokenSchema } from '../schemas/token.js'
import { baseHeaders, ErrorSchema } from './_utils.js'

export const personalAccessTokenContract = contractInstance.router({
  listPersonalAccessTokens: {
    method: 'GET',
    path: '',
    responses: {
      200: PersonalAccessTokenSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  createPersonalAccessToken: {
    method: 'POST',
    path: '',
    body: PersonalAccessTokenSchema.pick({ name: true, expirationDate: true }).required(),
    responses: {
      201: ExposedPersonalAccessTokenSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },

  deletePersonalAccessToken: {
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
  pathPrefix: `${apiPrefix}/user/tokens`,
})
