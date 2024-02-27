import { z } from 'zod'
import { ClusterPrivacy } from '../utils/const.js'
import { ErrorSchema } from './utils.js'
import { EnvironmentSchema } from './environment.js'
import { OrganizationSchema } from './organization.js'
import { ProjectSchema } from './project.js'
import { UserSchema } from './user.js'

export const ClusterSchema = z.object({
  id: z.string()
    .uuid(),
  label: z.string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .max(50),
  infos: z.string()
    .max(200)
    .optional(),
  secretName: z.string()
    .max(50)
    .optional(),
  clusterResources: z.boolean(),
  privacy: z.nativeEnum(ClusterPrivacy),
  projectIds: z.string()
    .uuid()
    .array()
    .optional(),
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

export const CreateClusterBusinessSchema = ClusterSchema.omit({ id: true }).refine(
  ({ privacy, projectIds }) =>
    !!(privacy === ClusterPrivacy.DEDICATED && projectIds?.length) ||
      privacy === ClusterPrivacy.PUBLIC,
  { message: 'Si le cluster est dédié, vous devez renseignez les ids des projets associés.' },
)

export const ClusterBusinessSchema = ClusterSchema.refine(
  ({ privacy, projectIds }) =>
    !!(privacy === ClusterPrivacy.DEDICATED && projectIds?.length) ||
      privacy === ClusterPrivacy.PUBLIC,
  { message: 'Si le cluster est dédié, vous devez renseignez les ids des projets associés.' },
)

export type Cluster = Zod.infer<typeof ClusterSchema>

export const CreateClusterSchema = {
  body: ClusterSchema.omit({ id: true }),
  responses: {
    201: ClusterSchema.omit({ cluster: true, stageIds: true, user: true }),
    400: ErrorSchema,
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetClustersSchema = {
  responses: {
    200: z.array(ClusterSchema.pick({ id: true, label: true, projectIds: true, stageIds: true })),
    401: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetClusterAssociatedEnvironmentsSchema = {
  params: z.object({
    clusterId: z.string()
      .uuid(),
  }),
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
  params: z.object({
    clusterId: z.string()
      .uuid(),
  }),
  body: ClusterSchema.partial(),
  responses: {
    200: ClusterSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const DeleteClusterSchema = {
  params: z.object({
    clusterId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    400: ErrorSchema,
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}
