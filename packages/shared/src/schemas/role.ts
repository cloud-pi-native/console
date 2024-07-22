import { z } from 'zod'
import { permissionLevelSchema } from '../utils/permissions.js'

export const RoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(30),
  permissions: permissionLevelSchema,
  position: z.number().min(0),
})

export const ProjectRoleSchema = RoleSchema.extend({
  projectId: z.string().uuid(),
})

export const AdminRoleSchema = RoleSchema.extend({
  oidcGroup: z.string(),
})

export type Role = Zod.infer<typeof RoleSchema>
export type RoleBigint = Omit<Zod.infer<typeof RoleSchema>, 'permissions'> & { permissions: bigint }
export type AdminRole = Zod.infer<typeof AdminRoleSchema>
export type ProjectRole = Zod.infer<typeof ProjectRoleSchema>
