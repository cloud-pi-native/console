import { z } from 'zod'
import { EnvironmentSchema } from './environment.js'
import { OrganizationSchema } from './organization.js'
// import { ProjectSchemaV2 } from './project.js'
import { UserSchema } from './user.js'
import { ErrorSchema } from './utils.js'

export const ClusterPrivacySchema = z.enum(['public', 'dedicated'])

export const CleanedClusterSchema = z.object({
  id: z.string()
    .uuid(),
  label: z.string()
    .regex(/^[a-z0-9-]+$/i)
    .max(50),
  infos: z.string()
    .max(200)
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
    tlsServerName: z.string()
      .min(1),
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

export const ClusterParams = z.object({
  clusterId: CleanedClusterSchema.shape.id,
})

export const CreateClusterSchema = {
  body: ClusterDetailsSchema.omit({ id: true }),
  responses: {
    201: ClusterDetailsSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}
export type CreateClusterBody = Zod.infer<typeof CreateClusterSchema.body>

export const GetClustersSchema = {
  responses: {
    200: z.array(CleanedClusterSchema),
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetClusterAssociatedEnvironmentsSchema = {
  params: ClusterParams,
  responses: {
    200: z.array(z.object({
      organization: OrganizationSchema.shape.name,
      // TODO: Remettre `ProjectSchemaV2.shape.name` mais attention aux projets non compatibles
      project: z.string(),
      name: EnvironmentSchema.shape.name,
      owner: UserSchema.shape.email.optional(),
    })),
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetClusterDetailsSchema = {
  params: ClusterParams,
  responses: {
    200: ClusterDetailsSchema,
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetClusterKubeconfigSchema = {
  params: ClusterParams,
  responses: {
    200: KubeconfigSchema,
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateClusterSchema = {
  params: ClusterParams,
  body: ClusterDetailsSchema.omit({ id: true, label: true }).partial(),
  responses: {
    200: ClusterDetailsSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export type UpdateClusterBody = Zod.infer<typeof UpdateClusterSchema.body>

export const DeleteClusterSchema = {
  params: ClusterParams,
  responses: {
    204: null,
    400: ErrorSchema,
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}
