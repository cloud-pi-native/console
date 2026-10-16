import type Zod from 'zod'
import { z } from 'zod'

import { CoerceBooleanSchema } from './_utils.js'

export const ClusterPrivacySchema = z.enum(['public', 'dedicated'])

export const clusterLabelValidationMessage = 'Le nom du cluster doit contenir uniquement des lettres minuscules, des chiffres et des traits d’union, et commencer et terminer par un caractère alphanumérique.'

const ClusterLabelSchema = z.string()
  .max(50, { message: 'Le nom du cluster ne doit pas dépasser 50 caractères' })
  .regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, { message: clusterLabelValidationMessage })

export const CleanedClusterSchema = z.object({
  id: z.string()
    .uuid(),
  label: ClusterLabelSchema,
  infos: z.string()
    .max(1000)
    .optional()
    .nullable()
    .transform(value => value ?? ''),
  clusterResources: z.boolean(),
  privacy: ClusterPrivacySchema,
  zoneId: z.string()
    .uuid(),
  stageIds: z.string()
    .uuid()
    .array(),
  cpu: z.coerce.number().gte(0),
  gpu: z.coerce.number().gte(0),
  memory: z.coerce.number().gte(0),
})

export const KubeconfigSchema = z.object({
  user: z.object({
    username: z.string()
      .optional(),
    password: z.string()
      .optional(),
    keyData: z.string()
      .optional(),
    certData: z.string()
      .optional(),
    token: z.string()
      .optional(),
  }),
  cluster: z.object({
    server: z.string()
      .optional(),
    tlsServerName: z.string(),
    skipTLSVerify: z.boolean()
      .optional(),
    caData: z.string()
      .optional(),
  }),
})

export const ClusterDetailsSchema = CleanedClusterSchema.merge(z.object({
  projectIds: z.string()
    .uuid()
    .array()
    .optional(),
  kubeconfig: KubeconfigSchema,
}))

export const CreateClusterBodySchema = ClusterDetailsSchema.omit({ id: true })

export const UpdateClusterBodySchema = CreateClusterBodySchema.partial()

export const DeleteClusterQuerySchema = z.object({
  force: CoerceBooleanSchema.optional(),
})

export const ClusterUsageSchema = z.object({
  cpu: z.number(),
  gpu: z.number(),
  memory: z.number(),
})

export type Cluster = Zod.infer<typeof CleanedClusterSchema>
export type ClusterDetails = Zod.infer<typeof ClusterDetailsSchema>
export type Kubeconfig = Zod.infer<typeof KubeconfigSchema>
export type CreateClusterBody = Zod.infer<typeof CreateClusterBodySchema>
export type UpdateClusterBody = Zod.infer<typeof UpdateClusterBodySchema>
export type DeleteClusterQuery = Zod.infer<typeof DeleteClusterQuerySchema>

export type CleanedCluster = Zod.infer<typeof CleanedClusterSchema>
export type ClusterUsage = Zod.infer<typeof ClusterUsageSchema>
