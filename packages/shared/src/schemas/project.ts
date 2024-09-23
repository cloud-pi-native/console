import { z } from 'zod'
import { longestEnvironmentName, projectStatus } from '../utils/const.js'
import { AtDatesToStringExtend, CoerceBooleanSchema, permissionLevelSchema } from './_utils.js'
import { RepoSchema } from './repository.js'
import { MemberSchema, UserSchema } from './user.js'
import { OrganizationSchema } from './organization.js'
import { RoleSchema } from './role.js'

export const descriptionMaxLength = 280
export const projectNameMaxLength = 20
export const ProjectStatusSchema = z.enum(projectStatus)

const ProjectEnvironmentSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-z0-9]+$/)
    .min(2)
    .max(longestEnvironmentName),
  projectId: z.string()
    .uuid(),
  quotaId: z.string().uuid(),
  stageId: z.string().uuid(),
  clusterId: z.string()
    .uuid(),
  permissions: z.array(z.object({
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
  })),
})
export const ProjectSchema = z.object({

  // ProjectInfos
  organization: OrganizationSchema.optional(),
  repositories: RepoSchema.array(),
  environments: ProjectEnvironmentSchema.array(),
})

export type Project = Zod.infer<typeof ProjectSchema>

export const ProjectSchemaV2 = z.object({
  clusterIds: z.string().uuid().array(),
  name: z.string()
    .min(2)
    .max(projectNameMaxLength)
    .regex(/^[a-z0-9]+$/),
  description: z.string()
    .max(descriptionMaxLength)
    .optional(),
  organizationId: z.string()
    .uuid(),
  status: ProjectStatusSchema,
  locked: CoerceBooleanSchema,

  id: z.string()
    .uuid(),
  members: MemberSchema
    .array(),
  ownerId: z.string()
    .uuid(),
  owner: UserSchema
    .omit({ adminRoleIds: true }),
  roles: RoleSchema
    .array(),
  everyonePerms: permissionLevelSchema,
})
  .extend(AtDatesToStringExtend)

export type ProjectV2 = Zod.infer<typeof ProjectSchemaV2>
