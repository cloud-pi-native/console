import { z } from 'zod'
import { ErrorSchema } from './utils.js'
import { projectRoles } from '../utils/const.js'

export const UserSchema = z.object({
  id: z.string()
    .uuid(),
  firstName: z.string()
    .min(1, { message: 'must be at least 1 character long' })
    .max(50, { message: 'must not exceed 50 characters' }),
  lastName: z.string()
    .min(1, { message: 'must be 1 at least characters long' })
    .max(50, { message: 'must not exceed 50 characters' }),
  email: z.string()
    .email(),
  groups: z.string().array().optional(),
})

export type User = Zod.infer<typeof UserSchema>

export const RoleSchema = z.object({
  userId: z.string()
    .uuid(),
  projectId: z.string()
    .uuid(),
  role: z.enum(projectRoles),
})

export type Role = Zod.infer<typeof RoleSchema>

export const RoleWithUserSchema = RoleSchema.extend({ user: UserSchema })

const projectIdParams = z.object({
  projectId: z.string()
    .uuid(),
})

export const GetProjectUsersSchema = {
  params: projectIdParams,
  responses: {
    200: z.array(UserSchema.omit({ groups: true })),
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetMatchingUsersSchema = {
  params: projectIdParams,
  query: z.object({
    letters: z.string(),
  }),
  responses: {
    200: z.array(UserSchema.omit({ groups: true })),
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const CreateUserRoleInProjectSchema = {
  params: projectIdParams,
  body: UserSchema.pick({ email: true }),
  responses: {
    201: z.array(RoleWithUserSchema),
    400: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateUserRoleInProjectSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
    userId: z.string()
      .uuid(),
  }),
  body: RoleSchema.pick({ role: true }),
  responses: {
    200: z.array(RoleWithUserSchema),
    400: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}
