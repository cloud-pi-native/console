import { z } from 'zod'
import type Zod from 'zod'
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
  cpu: z.coerce.number().gte(0),
  gpu: z.coerce.number().gte(0),
  memory: z.coerce.number().gte(0),
}).extend(AtDatesToStringExtend)

export type Environment = Zod.infer<typeof EnvironmentSchema>
