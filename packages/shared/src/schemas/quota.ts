import { z } from 'zod'
import { ErrorSchema } from './utils.js'
import { StageSchema } from './stage.js'

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
  quotaStage: z.array(z.object({
    id: z.string()
      .uuid(),
    quotaId: z.string()
      .uuid(),
    stageId: z.string()
      .uuid(),
    status: z.string(),
    stage: z.object({
      id: z.string()
        .uuid(),
      name: z.string()
        .regex(/^[a-zA-Z0-9]+$/)
        .min(2, { message: 'must be at least 2 character long' })
        .max(20, { message: 'must not exceed 20 characters' }),
      quotaIds: z.string().uuid().array().optional(),
      clusterIds: z.string().uuid().array().optional(),
    })
      .optional(),
  })).optional(),
})

export const QuotaStageSchema = z.object({
  id: z.string()
    .uuid(),
  quotaId: z.string()
    .uuid(),
  stageId: z.string()
    .uuid(),
  status: z.string(),
  stage: StageSchema
    .optional(),
  quota: QuotaSchema
    .optional(),
})

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
    200: z.array(z.object({
      organization: z.string(),
      project: z.string(),
      name: z.string(),
      stage: z.string()
        .optional(),
      owner: z.string(),
    })),
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
