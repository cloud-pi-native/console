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
  argocdUrl: z.string()
    .min(5, { message: 'Longueur minimum 5 caractères' })
    .url({ message: 'Url invalide' }),
  description: z.string()
    .max(200)
    .optional()
    .nullable()
    .transform(value => value ?? ''),
})

export type Zone = Zod.infer<typeof ZoneSchema>
