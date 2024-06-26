import { z } from 'zod'
import { ErrorSchema } from './utils.js'
import { ClusterSchema } from './cluster.js'

export const StageSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-zA-Z0-9]+$/)
    .min(2, { message: 'must be at least 2 character long' })
    .max(20, { message: 'must not exceed 20 characters' }),
  quotaIds: z.string().uuid().array().optional(),
  clusterIds: z.string().uuid().array().optional(),
  quotaStage: z.array(z.object({
    id: z.string()
      .uuid(),
    quotaId: z.string()
      .uuid(),
    stageId: z.string()
      .uuid(),
    status: z.string(),
    quota: z.object({
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
    }).optional(),
  })).optional(),
})

export type Stage = Zod.infer<typeof StageSchema>

export const CreateStageSchema = {
  body: StageSchema.omit({ id: true }),
  responses: {
    201: StageSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetStagesSchema = {
  responses: {
    200: z.array(StageSchema.required({ clusterIds: true, quotaStage: true })),
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

export const UpdateStageClustersSchema = {
  params: z.object({
    stageId: z.string()
      .uuid(),
  }),
  body: z.object({
    clusterIds: z.array(
      z.string()
        .uuid()),
  }),
  responses: {
    200: z.array(ClusterSchema.omit({ projectIds: true, stageIds: true, user: true, cluster: true })),
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
