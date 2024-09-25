import { z } from 'zod'
import type { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../index.js'
import { AtDatesToStringExtend } from '../schemas/_utils.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const adminLogsQuery = z.object({
  offset: z.coerce.number(),
  limit: z.coerce.number(),
})
export type AdminLogsQuery = Zod.infer<typeof adminLogsQuery>

export const logContract = contractInstance.router({
  getLogs: {
    method: 'GET',
    path: '',
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
            failed: z.boolean().or(z.array(z.string())).optional(),
            results: z.any(),
            totalExecutionTime: z.number().optional(),
          }),
          action: z.string(),
          userId: z.string().nullable(),
          requestId: z.string().nullable(),
        }).extend(AtDatesToStringExtend)),
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/logs`,
})

export type GetLogsQuery = ClientInferRequest<typeof logContract.getLogs>['query']

export type Log = ClientInferResponseBody<typeof logContract.getLogs, 200>['logs'][number]
