import type Zod from 'zod'
import { z } from 'zod'
import { permissionLevelSchema } from './_utils.js'

export const RoleNameSchema = z.string().max(30)

export const RoleSchema = z.object({
  id: z.string().uuid(),
  name: RoleNameSchema,
  permissions: permissionLevelSchema,
  position: z.number().min(0),
})

export const ProjectRoleSchema = RoleSchema.extend({
  projectId: z.string().uuid(),
})

export const AdminRoleSchema = RoleSchema.extend({
  oidcGroup: z.string(),
})

export const RoleNameCsvSchema = z.string()
  .refine((value) => {
    return !value.split(',').some(name => !RoleNameSchema.safeParse(name).success)
  })
  .transform(value => value.split(','))

export type Role = Zod.infer<typeof RoleSchema>
export type RoleBigint = Omit<Zod.infer<typeof RoleSchema>, 'permissions'> & { permissions: bigint }
export type AdminRole = Zod.infer<typeof AdminRoleSchema>
export type ProjectRole = Zod.infer<typeof ProjectRoleSchema>
