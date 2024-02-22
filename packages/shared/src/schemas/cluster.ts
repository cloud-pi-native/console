import { z } from 'zod'
import { ClusterPrivacy } from '../utils/const.js'

const CreateClusterSchema = z.object({
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

const UpdateClusterSchema = z.object({
  id: z.string()
    .uuid(),
})

export const ClusterSchema = UpdateClusterSchema.merge(CreateClusterSchema)

export const CreateClusterBusinessSchema = CreateClusterSchema.refine(
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
