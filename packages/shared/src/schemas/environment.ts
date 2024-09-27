import { z } from 'zod'
import { longestEnvironmentName } from '../utils/const.js'

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
})

export type Environment = Zod.infer<typeof EnvironmentSchema>
