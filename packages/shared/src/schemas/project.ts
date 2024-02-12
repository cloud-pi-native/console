import { z } from 'zod'
import { projectStatus } from '../utils/const.js'

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
