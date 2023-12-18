import { FromSchema } from 'json-schema-to-ts'
import { quotaStageOpenApiSchema, quotaOpenApiSchema } from '../../openApiSchemas/quota.js'

export type QuotaStageModel = FromSchema<typeof quotaStageOpenApiSchema>

export type QuotaModel = FromSchema<typeof quotaOpenApiSchema>
