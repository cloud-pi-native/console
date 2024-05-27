import { z } from 'zod'
import { apiPrefix, contractInstance } from '../index.js'
import { AtDatesToStringSchema, ErrorSchema } from '../schemas/utils.js'
import { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'

export const adminLogsQuery = z.object({
  offset: z.coerce.number(),
  limit: z.coerce.number(),
})
export type AdminLogsQuery = Zod.infer<typeof adminLogsQuery>

export const logAdminContract = contractInstance.router({
  getLogs: {
    method: 'GET',
    path: `${apiPrefix}/admin/logs`,
    query: adminLogsQuery,
    summary: 'Get logs',
    description: 'Retrieved all logs.',
    responses: {
      200: z.object({
        total: z.number(),
        logs: z.array(z.object({
          id: z.string(),
          data: z.object({
            args: z.any(),
            failed: z.boolean().or(z.array(z.string())),
            results: z.any(),
            totalExecutionTime: z.number().optional(),
          }),
          action: z.string(),
          userId: z.string(),
          requestId: z.string(),
        }).merge(AtDatesToStringSchema)),
      }),
      500: ErrorSchema,
    },
  },
})

export type GetLogsQuery = ClientInferRequest<typeof logAdminContract.getLogs>['query']

export type Log = ClientInferResponseBody<typeof logAdminContract.getLogs, 200>['logs'][number]
