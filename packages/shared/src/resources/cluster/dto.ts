import { FromSchema } from 'json-schema-to-ts'
import { createClusterSchema, updateClusterSchema } from './openApiSchema.js'

export type CreateClusterDto = FromSchema<typeof createClusterSchema['body']>

export type UpdateClusterDto = FromSchema<typeof updateClusterSchema['body']>

export type ClusterParams = FromSchema<typeof updateClusterSchema['params']>
