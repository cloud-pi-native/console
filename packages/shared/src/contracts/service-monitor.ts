import { z } from 'zod'
import type { ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../index.js'
import { ErrorSchema } from '../schemas/utils.js'

export const serviceContract = contractInstance.router({
  getServiceHealth: {
    method: 'GET',
    path: `${apiPrefix}/services`,
    summary: 'Get services health',
    description: 'Retrieved services health.',
    responses: {
      200: z.array(z.object({
        name: z.string(),
        status: z.enum(['OK', 'Dégradé', 'En échec', 'Inconnu']),
        interval: z.number(),
        lastUpdateTimestamp: z.number(),
        message: z.string(),
      })),
      500: ErrorSchema,
    },
  },
})

export type ServiceBody = ClientInferResponseBody<typeof serviceContract.getServiceHealth, 200>
