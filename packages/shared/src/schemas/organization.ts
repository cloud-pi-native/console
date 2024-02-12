import { z } from 'zod'

export const OrganizationSchema = z.object({
  id: z.string()
    .uuid(),
  source: z.string()
    .max(60)
    .optional(),
  name: z.string()
    .regex(/^[a-z-]*$/)
    .min(2)
    .max(10),
  label: z.string()
    .max(60),
  active: z.boolean(),
})

export type Organization = Zod.infer<typeof OrganizationSchema>
