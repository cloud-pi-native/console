import { z } from 'zod'
import { ErrorSchema } from './utils.js'

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

export const CreateOrganizationSchema = {
  body: OrganizationSchema.pick({ name: true, label: true, source: true }).required(),
  responses: {
    201: OrganizationSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetOrganizationsSchema = {
  responses: {
    200: z.array(OrganizationSchema),
    500: ErrorSchema,
  },
}

export const UpdateOrganizationSchema = {
  params: z.object({
    organizationName: z.string(),
  }),
  body: OrganizationSchema.partial(),
  responses: {
    200: OrganizationSchema,
    500: ErrorSchema,
  },
}
