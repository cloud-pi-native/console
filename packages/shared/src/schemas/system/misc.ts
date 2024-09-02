import { z } from 'zod'

export const versionSchema = z.object({
  version: z.string(),
})

export const healthzSchema = z.object({
  status: z.enum(['OK', 'KO']),
})
