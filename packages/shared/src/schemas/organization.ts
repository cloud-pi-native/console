import { z } from 'zod'
import { AtDatesToStringSchema, ErrorSchema } from './utils.js'

export const OrganizationSchema = z.object({
  id: z.string()
    .uuid(),
  source: z.string()
    .max(60)
    .optional(),
  name: z.string()
    .regex(/^[a-z]*$/)
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
    200: z.array(OrganizationSchema.merge(AtDatesToStringSchema)),
    500: ErrorSchema,
  },
}

export const UpdateOrganizationBodySchema = OrganizationSchema.pick({ active: true, label: true, source: true }).partial()

export const UpdateOrganizationSchema = {
  params: z.object({
    organizationName: z.string(),
  }),
  body: UpdateOrganizationBodySchema,
  responses: {
    200: OrganizationSchema.merge(AtDatesToStringSchema),
    500: ErrorSchema,
  },
}
