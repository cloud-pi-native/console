import { z } from 'zod'

export const StageSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-zA-Z0-9]+$/)
    .min(2, { message: 'must be at least 2 character long' })
    .max(20, { message: 'must not exceed 20 characters' }),
  quotaIds: z.string().uuid().array().optional(),
  clusterIds: z.string().uuid().array().optional(),
})

export type Stage = Zod.infer<typeof StageSchema>
