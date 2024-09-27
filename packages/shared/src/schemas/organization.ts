import { z } from 'zod'
import { AtDatesToStringExtend, CoerceBooleanSchema } from './_utils.js'

export const OrganizationSchema = z.object({
  id: z.string()
    .uuid(),
  source: z.string()
    .max(60),
  name: z.string()
    .regex(/^[a-z]*$/)
    .min(2)
    .max(10),
  label: z.string(),
  active: CoerceBooleanSchema,
}).extend(AtDatesToStringExtend)

export type Organization = Zod.infer<typeof OrganizationSchema>
