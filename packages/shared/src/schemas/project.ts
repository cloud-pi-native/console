import { z } from 'zod'
import { projectStatus } from '../utils/const.js'
import { ErrorSchema } from './utils.js'

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
    .optional(),
  organizationId: z.string()
    .uuid(),
  status: z.enum(projectStatus),
  locked: z.boolean(),

  // ProjectInfos
  services: z.object({}).optional(),
  organization: z.object({}).optional(),
  roles: z.object({}).array().optional(),
  clusters: z.object({}).array().optional(),
  repositories: z.object({}).array().optional(),
  environments: z.object({}).array().optional(),
})

export type Project = Zod.infer<typeof ProjectSchema>

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
  params: z.object({
    projectId: z.string()
      .uuid(),
  }),
  responses: {
    200: z.object({}),
    500: ErrorSchema,
  },
}

export const UpdateProjectSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
  }),
  body: ProjectSchema.partial(),
  responses: {
    200: ProjectSchema,
    500: ErrorSchema,
  },
}

export const ReplayHooksForProjectSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    500: ErrorSchema,
  },
}

export const PatchProjectSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
  }),
  body: z.object({
    lock: z.boolean(),
  }),
  responses: {
    200: null,
    500: ErrorSchema,
  },
}

export const ArchiveProjectSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    500: ErrorSchema,
  },
}
