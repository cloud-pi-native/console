import type Zod from 'zod'
import { z } from 'zod'
import { longestEnvironmentName, projectStatus } from '../utils/const.js'
import { AtDatesToStringExtend, CoerceBooleanSchema, permissionLevelSchema } from './_utils.js'
import { RepoSchema } from './repository.js'
import { MemberSchema, UserSchema } from './user.js'
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
  slug: z.string()
    .regex(/^[a-z0-9]+$/),
  projectId: z.string()
    .uuid(),
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
  slug: z.string(),
  description: z.string()
    .max(descriptionMaxLength)
    .optional(),
  status: ProjectStatusSchema,
  locked: CoerceBooleanSchema,
  limitless: CoerceBooleanSchema,
  hprodCpu: z.coerce.number().gte(0),
  hprodGpu: z.coerce.number().gte(0),
  hprodMemory: z.coerce.number().gte(0),
  prodCpu: z.coerce.number().gte(0),
  prodGpu: z.coerce.number().gte(0),
  prodMemory: z.coerce.number().gte(0),

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
  lastSuccessProvisionningVersion: z.string()
    .nullable(),
})
  .extend(AtDatesToStringExtend)

export type ProjectV2 = Zod.infer<typeof ProjectSchemaV2>
