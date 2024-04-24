import { z } from 'zod'
import { apiPrefix, contractInstance } from '../index.js'
import { ErrorSchema } from '../schemas/utils.js'
import { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'

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
        logs: z.array(z.object({
          id: z.string(),
          data: z.object({
            args: z.object({}),
            failed: z.boolean().or(z.array(z.string())),
            results: z.object({}),
            totalExecutionTime: z.number().optional(),
          }),
          action: z.string(),
          userId: z.string(),
          requestId: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
        })),
      }),
      500: ErrorSchema,
    },
  },
})

export type GetLogsQuery = ClientInferRequest<typeof logAdminContract.getLogs>['query']

export type Log = ClientInferResponseBody<typeof logAdminContract.getLogs, 200>['logs'][number]
