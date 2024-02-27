import { z } from 'zod'
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
      })),
      500: ErrorSchema,
    },
  },
})
