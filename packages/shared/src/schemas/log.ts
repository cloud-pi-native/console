import { z } from 'zod'
import { AtDatesToStringExtend } from './_utils.js'

export const CleanLogSchema = z.object({
  id: z.string(),
  data: z.object({
    failed: z.boolean().or(z.array(z.string())).optional(),
    warning: z.string().array().optional(),
    totalExecutionTime: z.number().optional(),
  }).strip(),
  action: z.string(),
  userId: z.string().nullable(),
})
  .extend(AtDatesToStringExtend)

export const LogSchema = z.object({
  id: z.string(),
  data: z.object({
    args: z.any(),
    failed: z.boolean().or(z.array(z.string())).optional(),
    warning: z.string().array().optional(),
    results: z.any(),
    totalExecutionTime: z.number().optional(),
  })
    .passthrough()
    .transform((data) => {
      delete data.config
      return data
    }),
  action: z.string(),
  userId: z.string().nullable(),
  requestId: z.string().nullable(),
})
  .extend(AtDatesToStringExtend)
