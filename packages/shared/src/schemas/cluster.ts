import { z } from 'zod'
import { EnvironmentSchema } from './environment.js'
import { OrganizationSchema } from './organization.js'
import { ProjectSchema } from './project.js'
import { UserSchema } from './user.js'
import { ErrorSchema } from './utils.js'

export const ClusterPrivacySchema = z.enum(['public', 'dedicated'])

export const ClusterSchema = z.object({
  id: z.string()
    .uuid(),
  label: z.string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .max(50),
  infos: z.string()
    .max(200)
    .nullable(),
  secretName: z.string()
    .max(50),
  clusterResources: z.boolean(),
  privacy: ClusterPrivacySchema,
  zoneId: z.string()
    .uuid(),
  projectIds: z.string()
    .uuid()
    .array(),
  stageIds: z.string()
    .uuid()
    .array(),
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

export const CreateClusterBusinessSchema = ClusterSchema.omit({ id: true, secretName: true })

export const ClusterBusinessSchema = ClusterSchema

const CleanedClusterSchema = ClusterSchema.pick({
  id: true,
  label: true,
  stageIds: true,
  clusterResources: true,
  privacy: true,
  infos: true,
  zoneId: true,
}).required()

export type Cluster = Zod.infer<typeof ClusterSchema>

export type CleanedCluster = Zod.infer<typeof CleanedClusterSchema>

export const ClusterParams = z.object({
  clusterId: ClusterSchema.shape.id,
})

export const CreateClusterSchema = {
  body: ClusterSchema.omit({ id: true, secretName: true }),
  responses: {
    201: ClusterSchema.omit({ cluster: true, stageIds: true, user: true }),
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}
export type CreateClusterBody = Zod.infer<typeof CreateClusterSchema.body>

export const KubeconfigSchema = ClusterSchema.pick({ cluster: true, user: true })
export type Kubeconfig = Zod.infer<typeof KubeconfigSchema>

export const GetClustersSchema = {
  responses: {
    200: z.array(CleanedClusterSchema),
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetAdminClustersSchema = {
  responses: {
    200: z.array(ClusterSchema),
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetClusterAssociatedEnvironmentsSchema = {
  params: ClusterParams,
  responses: {
    200: z.array(z.object({
      organization: OrganizationSchema.shape.name,
      project: ProjectSchema.shape.name,
      name: EnvironmentSchema.shape.name,
      owner: UserSchema.shape.email.optional(),
    })).optional(),
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateClusterSchema = {
  params: ClusterParams,
  body: ClusterSchema.omit({
    id: true,
    label: true,
    secretName: true,
  }).partial(),
  responses: {
    200: ClusterSchema,
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
