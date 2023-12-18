import { FromSchema } from 'json-schema-to-ts'
import { nonSensitiveClusterOpenApiSchema, sensitiveClusterOpenApiSchema } from '../../openApiSchemas/cluster'

export type SensitiveClusterModel = FromSchema<typeof sensitiveClusterOpenApiSchema>
export type NonSensitiveClusterModel = FromSchema<typeof nonSensitiveClusterOpenApiSchema>
