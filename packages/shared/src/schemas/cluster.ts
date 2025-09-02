import { z } from 'zod'

export const ClusterPrivacySchema = z.enum(['public', 'dedicated'])

export const CleanedClusterSchema = z.object({
  id: z.string()
    .uuid(),
  label: z.string()
    .regex(/^[a-z0-9-]+$/i)
    .max(50),
  infos: z.string()
    .max(1000)
    .optional()
    .nullable()
    .transform(value => value ?? ''),
  external: z.boolean(),
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

export type Cluster = Zod.infer<typeof CleanedClusterSchema>
export type ClusterDetails = Zod.infer<typeof ClusterDetailsSchema>
export type Kubeconfig = Zod.infer<typeof KubeconfigSchema>

export type CleanedCluster = Zod.infer<typeof CleanedClusterSchema>
