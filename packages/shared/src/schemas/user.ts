import { z } from 'zod'
import { AtDatesToStringExtend, dateToString } from './_utils.js'

export const UserTypeSchema = z.enum(['human', 'ghost', 'bot'])
export const UserSchema = z.object({
  id: z.string()
    .uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  adminRoleIds: z.string().uuid().array(),
  type: UserTypeSchema,
  lastLogin: dateToString.optional().nullable(),
})
  .extend(AtDatesToStringExtend)

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
