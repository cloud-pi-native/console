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
}

// The external repository is declared once per deployment source; every external
// value source resolves its path against it as `$<ref>/<path>`.
const externalValuesRefFields = {
  ref: z.string().min(1, 'Les values externes doivent avoir un nom de référence'),
  targetRevision: z.string().default(''),
  repositoryId: z.string().uuid('Les values externes doivent référencer un dépôt'),
}

export const DeploymentExternalValuesRefSchema = z.object({
  id: z.string().uuid(),
  ...externalValuesRefFields,
})

export const WritableDeploymentExternalValuesRefSchema = z.object(externalValuesRefFields)

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

const TypedDeploymentInternalValueSourceSchema = DeploymentInternalValueSourceSchema.extend({ type: z.literal('internal') })

export const DeploymentValueSourceSchema = z.discriminatedUnion('type', [
  TypedDeploymentInternalValueSourceSchema,
  DeploymentExternalValueSourceSchema.extend({ type: z.literal('external') }),
])

export const DeploymentSourceBaseSchema = z.object({
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

// `useExternalValues` tags which value sources a deployment source may hold: the
// external ref, and external entries resolving against it, only exist when true.
export const DeploymentSourceSchema = z.discriminatedUnion('useExternalValues', [
  DeploymentSourceBaseSchema.extend({
    useExternalValues: z.literal(false),
    valueSources: TypedDeploymentInternalValueSourceSchema.array(),
  }),
  DeploymentSourceBaseSchema.extend({
    useExternalValues: z.literal(true),
    externalValuesRef: DeploymentExternalValuesRefSchema,
    valueSources: DeploymentValueSourceSchema.array(),
  }),
])

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

const CreateInternalValueSourceSchema = z.object({ type: z.literal('internal'), ...internalValueSourceFields })
const CreateExternalValueSourceSchema = z.object({ type: z.literal('external'), ...externalValueSourceFields })
const UpdateInternalValueSourceSchema = CreateInternalValueSourceSchema.extend({ id: z.string().uuid().optional() })
const UpdateExternalValueSourceSchema = CreateExternalValueSourceSchema.extend({ id: z.string().uuid().optional() })

export const CreateDeploymentValueSourceSchema = z.discriminatedUnion('type', [CreateInternalValueSourceSchema, CreateExternalValueSourceSchema])
export const UpdateDeploymentValueSourceSchema = z.discriminatedUnion('type', [UpdateInternalValueSourceSchema, UpdateExternalValueSourceSchema])

const WritableDeploymentSourceBaseSchema = DeploymentSourceBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deploymentId: true,
  repository: true,
})

// First-class writable deployment source schemas, tagged like DeploymentSourceSchema:
// parsing proves the ref is present whenever external entries are.
// CreateDeploymentSchema / UpdateDeploymentSchema compose these.
export const CreateDeploymentSourceSchema = z.discriminatedUnion('useExternalValues', [
  WritableDeploymentSourceBaseSchema.extend({
    useExternalValues: z.literal(false),
    valueSources: CreateInternalValueSourceSchema.array().default([]),
  }),
  WritableDeploymentSourceBaseSchema.extend({
    useExternalValues: z.literal(true),
    externalValuesRef: WritableDeploymentExternalValuesRefSchema,
    valueSources: CreateDeploymentValueSourceSchema.array().default([]),
  }),
])

export const UpdateDeploymentSourceSchema = z.discriminatedUnion('useExternalValues', [
  WritableDeploymentSourceBaseSchema.extend({
    id: z.string().uuid().optional(),
    useExternalValues: z.literal(false),
    valueSources: UpdateInternalValueSourceSchema.array().default([]),
  }),
  WritableDeploymentSourceBaseSchema.extend({
    id: z.string().uuid().optional(),
    useExternalValues: z.literal(true),
    externalValuesRef: WritableDeploymentExternalValuesRefSchema,
    valueSources: UpdateDeploymentValueSourceSchema.array().default([]),
  }),
])

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
export type DeploymentExternalValuesRef = Zod.infer<typeof DeploymentExternalValuesRefSchema>
export type WritableDeploymentExternalValuesRef = Zod.infer<typeof WritableDeploymentExternalValuesRefSchema>
export type DeploymentValueSource = Zod.infer<typeof DeploymentValueSourceSchema>
export type DeploymentSource = Zod.infer<typeof DeploymentSourceSchema>
export type CreateDeploymentValueSource = Zod.infer<typeof CreateDeploymentValueSourceSchema>
export type UpdateDeploymentValueSource = Zod.infer<typeof UpdateDeploymentValueSourceSchema>
export type UpdateDeploymentInternalValueSource = Zod.infer<typeof UpdateInternalValueSourceSchema>
export type CreateDeploymentSource = Zod.infer<typeof CreateDeploymentSourceSchema>
export type UpdateDeploymentSource = Zod.infer<typeof UpdateDeploymentSourceSchema>
export type Deployment = Zod.infer<typeof DeploymentSchema>
export type CreateDeployment = Zod.infer<typeof CreateDeploymentSchema>
export type UpdateDeployment = Zod.infer<typeof UpdateDeploymentSchema>
