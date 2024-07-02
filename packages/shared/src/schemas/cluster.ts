import { z } from 'zod'
import { EnvironmentSchema } from './environment.js'
import { OrganizationSchema } from './organization.js'
import { ProjectSchema } from './project.js'
import { UserSchema } from './user.js'
import { ErrorSchema } from './utils.js'

const invalidUuidInfo = 'Il ne s\'agit pas d\'un UUID valid'
export const ClusterPrivacySchema = z.enum(['public', 'dedicated'], { description: 'Définit la confidentialité, public est disponible pour tous les projets / dedicated ne peut être utilisé que par les projets sélectionnés' })

export const ClusterSchema = z.object({
  id: z.string({ description: 'UUID du cluster' })
    .uuid(),
  label: z.string({ description: 'Label du cluster' })
    .regex(/^[a-zA-Z0-9-]+$/, 'caractères autorisés: a-z, A-Z, 0-9, -')
    .max(50),
  infos: z.string({ description: 'Informations publiques sur le serveur' })
    .max(200, 'ne peut dépasser 200 caractères')
    .optional()
    .nullable(),
  clusterResources: z.boolean({
    description: 'Définit si le clusteur est capable de manager des ressources de niveau cluster',
    coerce: false,
  }),
  privacy: ClusterPrivacySchema,
  zoneId: z.string({ description: 'Id de la zone de rattachement du cluster' })
    .uuid(invalidUuidInfo),
  stageIds: z.string({ description: 'Liste des types d\'environnments rattachés par leur ids' })
    .uuid(invalidUuidInfo)
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
  }, { description: 'Voir https://kubernetes.io/docs/reference/config-api/kubeconfig.v1/#AuthInfo, uniquement les clés [username, password, token, client-certificate-data (certData), client-key-data (keyData)]' })
    .optional(),
  cluster: z.object({
    server: z.string()
      .optional(),
    tlsServerName: z.string(),
    skipTLSVerify: z.boolean()
      .optional(),
    caData: z.string()
      .optional(),
  }, { description: 'Voir https://kubernetes.io/docs/reference/config-api/kubeconfig.v1/#Cluster, uniquement les clés [tls-server-name(tlsServerName), certificate-authority-data (caData), server, insecure-skip-tls-verify (skipTLSVerify)' })
    .optional(),
})

export const CreateClusterBusinessSchema = ClusterSchema.omit({ id: true })

export const ClusterBusinessSchema = ClusterSchema

export const CleanedClusterSchema = ClusterSchema.pick({
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
  body: ClusterSchema.omit({ id: true }),
  responses: {
    201: ClusterSchema.omit({ cluster: true, stageIds: true, user: true }),
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
  body: ClusterSchema.partial(),
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
