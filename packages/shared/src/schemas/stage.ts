import { z } from 'zod'

export const StageSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-z0-9]+$/i)
    .min(2, { message: 'must be at least 2 character long' })
    .max(20, { message: 'must not exceed 20 characters' }),
  clusterIds: z.string().uuid().array(),
  quotaIds: z.string().uuid().array(),
})

export type Stage = Zod.infer<typeof StageSchema>
