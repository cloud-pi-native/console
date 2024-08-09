import { z } from 'zod'
import { AtDatesToStringExtend, ErrorSchema } from './utils.js'

export const UserSchema = z.object({
  id: z.string()
    .uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  adminRoleIds: z.string().uuid().array(),
}).extend(AtDatesToStringExtend)

export const MemberSchema = z.object({
  userId: z.string()
    .uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
    .email(),
  roleIds: z.string().uuid().array(),
})
  .or(
    z.object({
      user: UserSchema,
      roleIds: z.string().uuid().array(),
    }).transform(({ user: { adminRoleIds: _, id: userId, ...user }, roleIds }) => ({ userId, roleIds, ...user }))
    ,
  )

export type User = Zod.infer<typeof UserSchema>
export type Member = Zod.infer<typeof MemberSchema>

const projectIdParams = z.object({
  projectId: z.string()
    .uuid(),
})

export const GetProjectMembersSchema = {
  params: projectIdParams,
  responses: {
    200: z.array(MemberSchema),
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetAllUsersSchema = {
  responses: {
    200: UserSchema
      .extend({
        ...AtDatesToStringExtend,
        isAdmin: z.boolean(),
      })
      .array(),
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetMatchingUsersSchema = {
  query: z.object({
    letters: z.string(),
    notInProjectId: z.string().uuid().optional(),
  }),
  responses: {
    200: z.array(UserSchema),
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const CreateUserRoleInProjectSchema = {
  params: projectIdParams,
  body: UserSchema.pick({ email: true }),
  responses: {
    201: z.array(MemberSchema),
    400: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const TransferProjectOwnershipSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
    userId: z.string()
      .uuid(),
  }),
  responses: {
    200: z.array(MemberSchema),
    400: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateUserAdminRoleSchema = {
  params: z.object({
    userId: z.string()
      .uuid(),
  }),
  body: z.object({ isAdmin: z.boolean() }),
  responses: {
    204: null,
    400: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}
