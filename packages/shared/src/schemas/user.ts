import { z } from 'zod'

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
