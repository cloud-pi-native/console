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
  stageId: z.string().uuid().optional(),
  quotaId: z.string().uuid().optional(),
  clusterId: z.string()
    .uuid().optional(),
  permissions: z.lazy(() => PermissionSchema.array()).optional(),
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
    400: ErrorSchema,
    401: ErrorSchema,
    403: ErrorSchema,
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
  body: EnvironmentSchema.pick({ quotaId: true }),
  responses: {
    200: EnvironmentSchema.omit({ permissions: true }),
    400: ErrorSchema,
    401: ErrorSchema,
    403: ErrorSchema,
    404: ErrorSchema,
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
    400: ErrorSchema,
    401: ErrorSchema,
    403: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}
