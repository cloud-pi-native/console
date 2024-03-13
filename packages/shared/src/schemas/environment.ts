import { z } from 'zod'

import { allStatus, longestEnvironmentName } from '../utils/const.js'
import { PermissionSchema } from './permission.js'

export const EnvironmentSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-z0-9]+$/)
    .min(2)
    .max(longestEnvironmentName),
  projectId: z.string()
    .uuid(),
  quotaStageId: z.string()
    .uuid(),
  clusterId: z.string()
    .uuid(),
  status: z.enum(allStatus),
  permissions: z.lazy(() => PermissionSchema.array()),
})

export type Environment = Zod.infer<typeof EnvironmentSchema>
