import { z } from 'zod'
import { apiPrefix, contractInstance } from '../index.js'
import { ErrorSchema } from '../schemas/utils.js'
import { ClientInferRequest } from '@ts-rest/core'

export const logAdminContract = contractInstance.router({
  getLogs: {
    method: 'GET',
    path: `${apiPrefix}/admin/logs`,
    query: z.object({
      offset: z.string(),
      limit: z.string(),
    }),
    summary: 'Get logs',
    description: 'Retrieved all logs.',
    responses: {
      200: z.object({
        total: z.number(),
        logs: z.array(z.object({})),
      }),
      500: ErrorSchema,
    },
  },
})

export type GetLogsQuery = ClientInferRequest<typeof logAdminContract.getLogs>['query']
