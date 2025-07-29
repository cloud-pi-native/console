import { z } from 'zod'
import { longestEnvironmentName } from '../utils/const'
import { AtDatesToStringExtend } from './_utils'

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
  quotaId: z.string().uuid(),
  clusterId: z.string()
    .uuid(),
}).extend(AtDatesToStringExtend)

export type Environment = Zod.infer<typeof EnvironmentSchema>
