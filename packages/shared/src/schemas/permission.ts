import { z } from 'zod'
import { ErrorSchema } from './utils.js'

export const PermissionSchema = z.object({
  id: z.string()
    .uuid(),
  userId: z.string()
    .uuid(),
  environmentId: z.string()
    .uuid(),
  level: z.union([
    z.string(),
    z.number()
      .int()
      .nonnegative()
      .max(2),
  ]),
})

export type Permission = Zod.infer<typeof PermissionSchema>

export const CreatePermissionSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
    environmentId: z.string()
      .uuid(),
  }),
  body: PermissionSchema.omit({ id: true, environmentId: true }),
  responses: {
    201: PermissionSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetPermissionsSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
    environmentId: z.string()
      .uuid(),
  }),
  responses: {
    200: z.array(PermissionSchema),
    500: ErrorSchema,
  },
}

export const UpdatePermissionSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
    environmentId: z.string()
      .uuid(),
  }),
  body: PermissionSchema.pick({ level: true, userId: true }),
  responses: {
    200: PermissionSchema,
    500: ErrorSchema,
  },
}

export const DeletePermissionSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
    environmentId: z.string()
      .uuid(),
    userId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    500: ErrorSchema,
  },
}
