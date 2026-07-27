import type Zod from 'zod'
import { z } from 'zod'
import { longestDeploymentName } from '../utils/const.js'
import { AtDatesToStringExtend } from './_utils.js'
import { EnvironmentSchema } from './environment.js'
import { RepoSchema } from './repository.js'

const DeploymentSourceType = z.enum(['git', 'oci'])

const internalValueSourceFields = {
  path: z.string(),
}

const externalValueSourceFields = {
  path: z.string(),
  ref: z.string().min(1, 'Une source de valeurs externe doit avoir un nom de référence'),
  targetRevision: z.string().default(''),
  repositoryId: z.string().uuid('Une source de valeurs externe doit référencer un dépôt'),
}

export const DeploymentInternalValueSourceSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int(),
  ...internalValueSourceFields,
})

export const DeploymentExternalValueSourceSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int(),
  ...externalValueSourceFields,
})

export const DeploymentValueSourceSchema = z.discriminatedUnion('type', [
  DeploymentInternalValueSourceSchema.extend({ type: z.literal('internal') }),
  DeploymentExternalValueSourceSchema.extend({ type: z.literal('external') }),
])

export const DeploymentSourceSchema = z.object({
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
  valueSources: DeploymentValueSourceSchema.array().default([]),
}).extend(AtDatesToStringExtend)

export const DeploymentSchema = z.object({
  id: z.string()
    .uuid(),
  name: z.string()
    .regex(/^[a-z0-9]+$/)
    .min(2)
    .max(longestDeploymentName),
  projectId: z.string()
    .uuid(),
  environmentId: z.string()
    .uuid(),
  autosync: z.boolean(),
  environment: EnvironmentSchema,
  deploymentSources: DeploymentSourceSchema.array(),
}).extend(AtDatesToStringExtend)

export const CreateDeploymentValueSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('internal'), ...internalValueSourceFields }),
  z.object({ type: z.literal('external'), ...externalValueSourceFields }),
])
export const UpdateDeploymentValueSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('internal'), id: z.string().uuid().optional(), ...internalValueSourceFields }),
  z.object({ type: z.literal('external'), id: z.string().uuid().optional(), ...externalValueSourceFields }),
])

// A deployment source may carry at most one external value source (internal ones are unlimited).
function refineSingleExternalValueSource(valueSources: { type: 'internal' | 'external' }[], ctx: Zod.RefinementCtx): void {
  if (valueSources.filter(valueSource => valueSource.type === 'external').length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Une seule source de valeurs externe est autorisée par source de déploiement',
    })
  }
}

const writableDeploymentSourceOmit = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deploymentId: true,
  repository: true,
  valueSources: true,
} as const

// First-class writable deployment source schemas, built on the value source
// definitions above. CreateDeploymentSchema / UpdateDeploymentSchema compose these.
export const CreateDeploymentSourceSchema = DeploymentSourceSchema.omit(writableDeploymentSourceOmit).extend({
  valueSources: CreateDeploymentValueSourceSchema.array().superRefine(refineSingleExternalValueSource).default([]),
})

export const UpdateDeploymentSourceSchema = CreateDeploymentSourceSchema.extend({
  id: z.string().uuid().optional(),
  valueSources: UpdateDeploymentValueSourceSchema.array().superRefine(refineSingleExternalValueSource).default([]),
})

export const CreateDeploymentSchema = DeploymentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  environment: true,
}).extend({
  deploymentSources: CreateDeploymentSourceSchema.array().min(1, 'Au moins une source de déploiement est requise'),
})

export const UpdateDeploymentSchema = CreateDeploymentSchema.extend({
  deploymentSources: UpdateDeploymentSourceSchema.array().min(1, 'Au moins une source de déploiement est requise'),
})

export type DeploymentInternalValueSource = Zod.infer<typeof DeploymentInternalValueSourceSchema>
export type DeploymentExternalValueSource = Zod.infer<typeof DeploymentExternalValueSourceSchema>
export type DeploymentValueSource = Zod.infer<typeof DeploymentValueSourceSchema>
export type DeploymentSource = Zod.infer<typeof DeploymentSourceSchema>
export type CreateDeploymentValueSource = Zod.infer<typeof CreateDeploymentValueSourceSchema>
export type UpdateDeploymentValueSource = Zod.infer<typeof UpdateDeploymentValueSourceSchema>
export type CreateDeploymentSource = Zod.infer<typeof CreateDeploymentSourceSchema>
export type UpdateDeploymentSource = Zod.infer<typeof UpdateDeploymentSourceSchema>
export type Deployment = Zod.infer<typeof DeploymentSchema>
export type CreateDeployment = Zod.infer<typeof CreateDeploymentSchema>
export type UpdateDeployment = Zod.infer<typeof UpdateDeploymentSchema>
