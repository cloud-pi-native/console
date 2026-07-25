import type Zod from 'zod'
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
  cpu: z.coerce.number().gte(0),
  gpu: z.coerce.number().gte(0),
  memory: z.coerce.number().gte(0),
  autosync: z.boolean(),
}).extend(AtDatesToStringExtend)

export const CreateEnvironmentSchema = EnvironmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  projectId: true,
})

export const UpdateEnvironmentSchema = EnvironmentSchema.pick({
  cpu: true,
  gpu: true,
  memory: true,
  autosync: true,
})

export type Environment = Zod.infer<typeof EnvironmentSchema>
export type CreateEnvironment = Zod.infer<typeof CreateEnvironmentSchema>
export type UpdateEnvironment = Zod.infer<typeof UpdateEnvironmentSchema>
