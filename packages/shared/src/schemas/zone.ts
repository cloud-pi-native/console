import { z } from 'zod'

export const ZoneSchema = z.object({
  id: z.string()
    .uuid(),
  slug: z.string()
    .min(1)
    .max(10)
    .regex(/^[a-z0-9-]+$/),
  label: z.string()
    .min(1)
    .max(50),
  description: z.string()
    .max(200)
    .optional()
    .nullable()
    .transform(value => value ?? ''),
})

export type Zone = Zod.infer<typeof ZoneSchema>
