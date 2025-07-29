import { z } from 'zod'
import type { ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance, ServiceHealthSchema } from '../index'
import { ErrorSchema, baseHeaders } from './_utils'

export const serviceContract = contractInstance.router({
  getServiceHealth: {
    method: 'GET',
    path: '/health-services',
    summary: 'Get services health',
    description: 'Retrieve services health.',
    responses: {
      200: ServiceHealthSchema.array(),
      500: ErrorSchema,
    },
  },

  getCompleteServiceHealth: {
    method: 'GET',
    path: '/complete-services',
    summary: 'Get services health with cause',
    description: 'Retrieve services health with cause.',
    responses: {
      200: ServiceHealthSchema.extend({
        cause: z.any().optional(),
      }).array(),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  refreshServiceHealth: {
    method: 'GET',
    path: '/refresh-services',
    summary: 'Force services health',
    description: 'Retrieved services health.',
    responses: {
      200: ServiceHealthSchema.array(),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}`,
})

export type ServiceBody = ClientInferResponseBody<typeof serviceContract.getCompleteServiceHealth, 200>
