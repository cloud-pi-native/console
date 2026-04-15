import type Zod from 'zod'
import { z } from 'zod'
import { longestEnvironmentName } from '../utils/const.js'
import { AtDatesToStringExtend } from './_utils.js'
import { EnvironmentSchema } from './environment.js'
import { RepoSchema } from './repository.js'

const DeploymentSourceType = z.enum(['git', 'oci'])

const DeploymentSourceSchema = z.object({
  id: z.string()
    .uuid(),
  deploymentId: z.string()
    .uuid(),
  repositoryId: z.string()
    .uuid(),
  type: DeploymentSourceType,
  repository: RepoSchema,
  // Optional deployment settings
  targetRevision: z.string().optional(),
  path: z.string().optional(),
  helmValuesFiles: z.string().optional(),
}).extend(AtDatesToStringExtend)

export const DeploymentSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-z0-9]+$/)
    .min(2)
    .max(longestEnvironmentName),
  projectId: z.string()
    .uuid(),
  environmentId: z.string()
    .uuid(),
  autosync: z.boolean(),
  environment: EnvironmentSchema,
  deploymentSources: DeploymentSourceSchema.array(),
}).extend(AtDatesToStringExtend)

export const CreateDeploymentSchema = DeploymentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  environment: true,
}).extend({
  deploymentSources: DeploymentSourceSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deploymentId: true,
    repository: true,
  }).array().min(1, 'Au moins une source de déploiement est requise'),
})

export const UpdateDeploymentSchema = CreateDeploymentSchema.extend({
  deploymentSources: DeploymentSourceSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deploymentId: true,
    repository: true,
  })
    .extend({ id: z.string().uuid().optional() })
    .array().min(1, 'Au moins une source de déploiement est requise'),
})

export type Deployment = Zod.infer<typeof DeploymentSchema>
export type CreateDeployment = Zod.infer<typeof CreateDeploymentSchema>
export type UpdateDeployment = Zod.infer<typeof UpdateDeploymentSchema>
