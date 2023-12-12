import { FromSchema } from 'json-schema-to-ts'
import { quotaStageOpenApiSchema, quotaOpenApiSchema } from './index.js'

export type QuotaStageModel = FromSchema<typeof quotaStageOpenApiSchema>

export type QuotaModel = FromSchema<typeof quotaOpenApiSchema>
