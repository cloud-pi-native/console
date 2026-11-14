import { z } from 'zod'

export const ExperimentalFeatureScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('instance'), id: z.literal('console') }).strict(),
  z.object({ kind: z.literal('cluster'), id: z.string().uuid() }).strict(),
  z.object({ kind: z.literal('project'), id: z.string().uuid() }).strict(),
  z.object({ kind: z.literal('environment'), id: z.string().uuid() }).strict(),
])

export const ExperimentalFeatureContextSchema = z.object({
  instanceId: z.literal('console').optional(),
  clusterId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  environmentId: z.string().uuid().optional(),
}).strict()

const publicationBase = z.object({ revision: z.number().int().positive() })

export const ExperimentalFeaturePublicationSchema = z.discriminatedUnion('key', [
  publicationBase.extend({
    key: z.literal('opencds'),
    rules: z.object({ scope: ExperimentalFeatureScopeSchema, variant: z.literal('enabled') }).strict().array(),
  }).strict(),
  publicationBase.extend({
    key: z.literal('forge'),
    rules: z.object({ scope: ExperimentalFeatureScopeSchema, variant: z.enum(['gitlab', 'forgejo']) }).strict().array(),
  }).strict(),
  publicationBase.extend({
    key: z.literal('deployments-v2'),
    rules: z.object({ scope: ExperimentalFeatureScopeSchema, variant: z.enum(['v1', 'v2']) }).strict().array(),
  }).strict(),
  publicationBase.extend({
    key: z.literal('execution-owner'),
    rules: z.object({ scope: ExperimentalFeatureScopeSchema, variant: z.enum(['treatment', 'operator']) }).strict().array(),
  }).strict(),
])

export const ExperimentalFeatureRequestSchema = z.object({
  requested: z.boolean(),
  expectedRevision: z.number().int().nonnegative(),
}).strict()

export const ExperimentalFeatureTargetSchema = z.object({
  id: z.string().uuid(),
  key: z.literal('opencds'),
  scope: ExperimentalFeatureScopeSchema,
  requested: z.boolean(),
  revision: z.number().int().nonnegative(),
  application: z.literal('not-observed'),
  events: z.object({
    revision: z.number().int().nonnegative(),
    action: z.enum(['authorize', 'activate', 'suspend']),
    actorId: z.string().uuid(),
    createdAt: z.string().datetime(),
  }).array(),
})

export type ExperimentalFeatureRequest = z.infer<typeof ExperimentalFeatureRequestSchema>
export type ExperimentalFeatureTarget = z.infer<typeof ExperimentalFeatureTargetSchema>
export type ExperimentalFeatureScope = z.infer<typeof ExperimentalFeatureScopeSchema>
export type ExperimentalFeatureContext = z.infer<typeof ExperimentalFeatureContextSchema>
export type ExperimentalFeaturePublication = z.infer<typeof ExperimentalFeaturePublicationSchema>
export type ExperimentalFeatureVariant = ExperimentalFeaturePublication['rules'][number]['variant']

// Evaluation is not an acknowledgement that a consumer has applied the decision.
export type ExperimentalFeatureEvaluation
  = | { status: 'selected', variant: ExperimentalFeatureVariant, revision: number }
    | { status: 'not-targeted' | 'conflict', revision: number }
