import { z } from 'zod'
import { longestEnvironmentName } from '../utils/const.js'
import { PermissionSchema } from './permission.js'
import { ErrorSchema } from './utils.js'

export const EnvironmentSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-z0-9]+$/)
    .min(2)
    .max(longestEnvironmentName),
  projectId: z.string()
    .uuid(),
  quotaStageId: z.string()
    .uuid(),
  clusterId: z.string()
    .uuid(),
  permissions: z.lazy(() => PermissionSchema.array()).optional(),
  quotaStage: z.object({
    id: z.string()
      .uuid(),
    quotaId: z.string()
      .uuid(),
    stageId: z.string()
      .uuid(),
    quota: z.object({}).optional(),
    stage: z.object({}).optional(),
    status: z.string(),
  }).optional(),
})

export type Environment = Zod.infer<typeof EnvironmentSchema>

export const CreateEnvironmentSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
  }),
  body: EnvironmentSchema.omit({ id: true, permissions: true }),
  responses: {
    201: EnvironmentSchema.omit({ permissions: true }),
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetEnvironmentsSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
  }),
  responses: {
    200: z.array(EnvironmentSchema),
    500: ErrorSchema,
  },
}

export const GetEnvironmentByIdSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
    environmentId: z.string()
      .uuid(),
  }),
  responses: {
    200: EnvironmentSchema,
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateEnvironmentSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
    environmentId: z.string()
      .uuid(),
  }),
  body: EnvironmentSchema.pick({ quotaStageId: true }),
  responses: {
    200: EnvironmentSchema.omit({ permissions: true }),
    500: ErrorSchema,
  },
}

export const DeleteEnvironmentSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
    environmentId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    500: ErrorSchema,
  },
}
