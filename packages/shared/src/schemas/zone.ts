import { z } from 'zod'
import { ErrorSchema } from './utils.js'
import { ClusterSchema } from './cluster.js'

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
    .nullable(),
  clusters: z.array(ClusterSchema)
    .optional(),
  clusterIds: z.array(z.string()
    .uuid())
    .optional(),
})

export type Zone = Zod.infer<typeof ZoneSchema>

export const GetZonesSchema = {
  responses: {
    200: z.array(ZoneSchema),
    500: ErrorSchema,
  },
}

export const CreateZoneSchema = {
  body: ZoneSchema.omit({ id: true }),
  responses: {
    201: ZoneSchema,
    500: ErrorSchema,
  },
}

export const UpdateZoneSchema = {
  params: z.object({
    zoneId: z.string()
      .uuid(),
  }),
  body: ZoneSchema.omit({ id: true, slug: true }),
  responses: {
    201: ZoneSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const DeleteZoneSchema = {
  params: z.object({
    zoneId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    500: ErrorSchema,
  },
}
