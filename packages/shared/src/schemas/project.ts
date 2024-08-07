import { z } from 'zod'
import { longestEnvironmentName, projectStatus } from '../utils/const.js'
import { AtDatesToStringExtend, ErrorSchema } from './utils.js'
import { RepoSchema } from './repository.js'
import { RoleSchema, UserSchema, UserWithRoleSchema } from './user.js'
import { OrganizationSchema } from './organization.js'
import { CoerceBooleanSchema } from '../utils/schemas.js'

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
  id: z.string()
    .uuid(),
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

  // ProjectInfos
  organization: OrganizationSchema.optional(),
  roles: z.array(RoleSchema.and(z.object({ user: UserSchema.optional() }))).optional(),
  clusterIds: z.string().uuid().array(),
  repositories: RepoSchema.array(),
  environments: ProjectEnvironmentSchema.array(),
}).extend(AtDatesToStringExtend)

export type Project = Zod.infer<typeof ProjectSchema>

export const ProjectSchemaV2 = ProjectSchema
  .pick({
    clusterIds: true,
    createdAt: true,
    description: true,
    id: true,
    locked: true,
    name: true,
    organizationId: true,
    status: true,
    updatedAt: true,
  })
  .extend({
    members: UserWithRoleSchema.array(),
  })
  .required({ description: true })

export type ProjectV2 = Zod.infer<typeof ProjectSchemaV2>

export const ProjectParams = z.object({
  projectId: z.string()
    .uuid(),
})

export const CreateProjectSchema = {
  body: ProjectSchemaV2.pick({ name: true, organizationId: true, description: true }),
  responses: {
    201: ProjectSchemaV2.omit({ name: true }).extend({ name: z.string() }),
    400: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetProjectsSchema = {
  query: ProjectSchemaV2
    .pick({
      id: true,
      name: true,
      status: true,
      locked: true,
      organizationId: true,
      description: true,
    })
    .extend({
      statusIn: z.string(),
      statusNotIn: z.string(),
      filter: z.enum(['owned', 'member', 'all']),
      organizationName: z.string(),
    })
    .partial().strict(),
  responses: {
    200: ProjectSchema
      .omit({
        name: true,
        environments: true,
      })
      .extend({
        name: z.string(),
        environments: ProjectEnvironmentSchema
          .omit({ name: true })
          .extend({ name: z.string() })
        ,
      })
      .array(),
    500: ErrorSchema,
  },
}

export const GetProjectsDataSchema = {
  responses: {
    200: z.string(),
  },
}
export const GetProjectSecretsSchema = {
  params: ProjectParams,
  responses: {
    200: z.record(z.record(z.string())),
    500: ErrorSchema,
  },
}

export const UpdateProjectSchema = {
  params: ProjectParams,
  body: ProjectSchemaV2.partial(),
  responses: {
    200: ProjectSchemaV2.omit({ name: true }).extend({ name: z.string() }),
    500: ErrorSchema,
  },
}

export const ReplayHooksForProjectSchema = {
  params: ProjectParams,
  responses: {
    204: null,
    500: ErrorSchema,
  },
}

export const PatchProjectSchema = {
  params: ProjectParams,
  body: z.object({
    lock: z.boolean(),
  }),
  responses: {
    200: null,
    500: ErrorSchema,
  },
}

export const ArchiveProjectSchema = {
  params: ProjectParams,
  responses: {
    204: null,
    500: ErrorSchema,
  },
}
