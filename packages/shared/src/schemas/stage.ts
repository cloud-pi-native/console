import { z } from 'zod'
import { ErrorSchema } from './utils.js'

export const StageSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-z0-9]+$/i)
    .min(2, { message: 'must be at least 2 character long' })
    .max(20, { message: 'must not exceed 20 characters' }),
  clusterIds: z.string().uuid().array(),
  quotaIds: z.string().uuid().array(),
})

export type Stage = Zod.infer<typeof StageSchema>

export const CreateStageSchema = {
  body: StageSchema.omit({ id: true }).partial({ clusterIds: true, quotaIds: true }),
  responses: {
    201: StageSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const ListStagesSchema = {
  responses: {
    200: StageSchema.array(),
    500: ErrorSchema,
  },
}

export const GetStageEnvironmentsSchema = {
  params: z.object({
    stageId: z.string()
      .uuid(),
  }),
  responses: {
    200: z.array(z.object({
      organization: z.string(),
      project: z.string(),
      name: z.string(),
      quota: z.string(),
      cluster: z.string(),
      owner: z.string().optional(),
    })),
    500: ErrorSchema,
  },
}

export const UpdateStageSchema = {
  params: z.object({
    stageId: z.string()
      .uuid(),
  }),
  body: StageSchema.pick({ clusterIds: true, name: true, quotaIds: true }).partial(),
  responses: {
    200: StageSchema,
    500: ErrorSchema,
  },
}

export const DeleteStageSchema = {
  params: z.object({
    stageId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    500: ErrorSchema,
  },
}
