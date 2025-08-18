import { z } from 'zod'
import { longestEnvironmentName } from '../utils/const.js'
import { AtDatesToStringExtend } from './_utils.js'

export const EnvironmentSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-z0-9]+$/)
    .min(2)
    .max(longestEnvironmentName),
  projectId: z.string()
    .uuid(),
  stageId: z.string().uuid(),
  clusterId: z.string()
    .uuid(),
  cpu: z.coerce.number().positive(),
  gpu: z.coerce.number().positive(),
  memory: z.coerce.number().positive(),
}).extend(AtDatesToStringExtend)

export type Environment = Zod.infer<typeof EnvironmentSchema>
