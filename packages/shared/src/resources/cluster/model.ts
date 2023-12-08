import { FromSchema } from 'json-schema-to-ts'
import { clusterOpenApiSchema } from './index.js'

export type ClusterModel = FromSchema<typeof clusterOpenApiSchema>
