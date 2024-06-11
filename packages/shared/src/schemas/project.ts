import { z } from 'zod'
import { longestEnvironmentName, projectStatus } from '../utils/const.js'
import { ErrorSchema } from './utils.js'
import { RepoSchema } from './repository.js'
import { RoleSchema, UserSchema } from './user.js'
import { OrganizationSchema } from './organization.js'
import { ClusterPrivacySchema } from './cluster.js'

export const descriptionMaxLength = 280
export const projectNameMaxLength = 20

export const ProjectSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-z0-9]+$/)
    .min(2)
    .max(projectNameMaxLength),
  description: z.string()
    .max(descriptionMaxLength)
    .optional()
    .nullable(),
  organizationId: z.string()
    .uuid(),
  status: z.enum(projectStatus),
  locked: z.boolean(),

  // ProjectInfos
  organization: OrganizationSchema.optional(),
  roles: z.array(RoleSchema.and(z.object({ user: UserSchema.optional() }))).optional(),
  clusters: z.array(z.object({
    id: z.string()
      .uuid(),
    label: z.string()
      .regex(/^[a-zA-Z0-9-]+$/)
      .max(50),
    infos: z.string()
      .max(200)
      .optional()
      .nullable(),
    secretName: z.string()
      .max(50)
      .optional(),
    clusterResources: z.boolean(),
    privacy: ClusterPrivacySchema,
    zoneId: z.string()
      .uuid(),
    projectIds: z.string()
      .uuid()
      .array()
      .optional(),
    stageIds: z.string()
      .uuid()
      .array()
      .optional(),
  })).optional(),
  repositories: z.array(RepoSchema).optional(),
  environments: z.array(z.object({
    id: z.string()
      .uuid(),
    name: z.string()
      .regex(/^[a-z0-9]+$/)
      .min(2)
      .max(longestEnvironmentName),
    projectId: z.string()
      .uuid(),
    quotaStageId: z.string()
      .uuid(),
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
      ]).optional(),
    })),
    quotaStage: z.object({
      id: z.string()
        .uuid(),
      quotaId: z.string()
        .uuid(),
      stageId: z.string()
        .uuid(),
      status: z.string(),
    }).optional(),
  })).optional(),
})

export type Project = Zod.infer<typeof ProjectSchema>

export const ProjectParams = z.object({
  projectId: z.string()
    .uuid(),
})

export const CreateProjectSchema = {
  body: ProjectSchema.omit({ id: true, status: true, locked: true }),
  responses: {
    201: ProjectSchema,
    400: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetProjectsSchema = {
  responses: {
    200: z.array(ProjectSchema),
    500: ErrorSchema,
  },
}

export const GetProjectSecretsSchema = {
  params: ProjectParams,
  responses: {
    200: z.object({}),
    500: ErrorSchema,
  },
}

export const UpdateProjectSchema = {
  params: ProjectParams,
  body: ProjectSchema.partial(),
  responses: {
    200: ProjectSchema,
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
