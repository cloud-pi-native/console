import { z } from 'zod'

export const QuotaSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .min(1),
  memory: z.string()
    .min(1),
  cpu: z.coerce.number().positive(),
  isPrivate: z.boolean(),
  stageIds: z.string().uuid().array(),
})

export type Quota = Zod.infer<typeof QuotaSchema>
