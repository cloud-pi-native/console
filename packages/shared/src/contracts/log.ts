import { z } from 'zod'
import type Zod from 'zod'
import type { ClientInferRequest } from '@ts-rest/core'
import { CleanLogSchema, LogSchema, apiPrefix, contractInstance } from '../index.js'
import { CoerceBooleanSchema } from '../schemas/_utils.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const adminLogsQuery = z.object({
  offset: z.coerce.number(),
  limit: z.coerce.number(),
  projectId: z.string().optional(),
  clean: CoerceBooleanSchema.default(true),
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
        logs: LogSchema.array().or(CleanLogSchema.array()),
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
  pathPrefix: `${apiPrefix}/logs`,
})

export type GetLogsQuery = ClientInferRequest<typeof logContract.getLogs>['query']

export type Log = Zod.infer<typeof LogSchema>
export type CleanLog = Zod.infer<typeof CleanLogSchema>
