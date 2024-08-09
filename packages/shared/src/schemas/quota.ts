import { z } from 'zod'
import { ErrorSchema } from './utils.js'

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

export const CreateQuotaSchema = {
  body: QuotaSchema.omit({ id: true }).partial({ stageIds: true }),
  responses: {
    201: QuotaSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const ListQuotasSchema = {
  responses: {
    200: z.array(QuotaSchema),
    500: ErrorSchema,
  },
}

export const ListQuotaEnvironmentsSchema = {
  params: z.object({
    quotaId: z.string()
      .uuid(),
  }),
  responses: {
    200: z.array(z.object({
      organization: z.string(),
      project: z.string(),
      name: z.string(),
      stage: z.string(),
      owner: z.string(),
    })),
    403: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateQuotaSchema = {
  params: z.object({
    quotaId: z.string()
      .uuid(),
  }),
  body: QuotaSchema.pick({
    isPrivate: true,
    cpu: true,
    memory: true,
    stageIds: true,
    name: true,
  }).partial(),
  responses: {
    200: QuotaSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const DeleteQuotaSchema = {
  params: z.object({
    quotaId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}
