import { z } from 'zod'

export const PermissionSchema = z.object({
  id: z.string()
    .uuid(),
  userId: z.string()
    .uuid(),
  environmentId: z.string()
    .uuid(),
  level: z.number()
    .int()
    .nonnegative()
    .max(2),
})

export type Permission = Zod.infer<typeof PermissionSchema>
