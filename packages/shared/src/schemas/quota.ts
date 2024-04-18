import { z } from 'zod'
import { ErrorSchema } from './utils.js'
import { EnvironmentSchema } from './environment.js'
import { StageSchema } from './stage.js'

export const QuotaStageBaseSchema = z.object({
  id: z.string()
    .uuid(),
  quotaId: z.string()
    .uuid(),
  stageId: z.string()
    .uuid(),
  status: z.string(),
})

export const QuotaSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .min(1),
  memory: z.string()
    .min(1),
  cpu: z.number()
    .positive(),
  isPrivate: z.boolean(),
  stageIds: z.string().uuid().array().optional(),
  quotaStage: z.array(QuotaStageBaseSchema).optional(),
})

export const QuotaStageSchema = QuotaStageBaseSchema.and(z.object({
  stage: StageSchema
    .optional(),
  quota: QuotaSchema
    .optional(),
}))

export type Quota = Zod.infer<typeof QuotaSchema>

export type QuotaStage = Zod.infer<typeof QuotaStageSchema>

export const CreateQuotaSchema = {
  body: QuotaSchema.omit({ id: true }),
  responses: {
    201: QuotaSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetQuotasSchema = {
  responses: {
    200: z.array(QuotaSchema),
    500: ErrorSchema,
  },
}

export const GetQuotaEnvironmentsSchema = {
  params: z.object({
    quotaId: z.string()
      .uuid(),
  }),
  responses: {
    200: z.array(EnvironmentSchema),
    500: ErrorSchema,
  },
}

export const UpdateQuotaStageSchema = {
  body: z.object({
    quotaId: z.string()
      .uuid(),
    stageIds: z.array(z.string()
      .uuid()),
    stageId: z.string()
      .uuid(),
    quotaIds: z.array(z.string()
      .uuid()),
  }).partial(),
  responses: {
    200: z.array(QuotaStageSchema),
    500: ErrorSchema,
  },
}

export const PatchQuotaSchema = {
  params: z.object({
    quotaId: z.string()
      .uuid(),
  }),
  body: QuotaSchema.pick({ isPrivate: true }),
  responses: {
    200: QuotaSchema,
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
    500: ErrorSchema,
  },
}
