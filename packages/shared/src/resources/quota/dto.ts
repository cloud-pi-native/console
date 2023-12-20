import { FromSchema } from 'json-schema-to-ts'
import { createQuotaSchema, getQuotaAssociatedEnvironmentsSchema, updateQuotaPrivacySchema, updateQuotaStageSchema } from './openApiSchema.js'

export type QuotaParams = FromSchema<typeof getQuotaAssociatedEnvironmentsSchema['params']>

export type CreateQuotaDto = FromSchema<typeof createQuotaSchema['body']>

export type UpdateQuotaPrivacyDto = FromSchema<typeof updateQuotaPrivacySchema['body']>

export type UpdateQuotaStageDto = FromSchema<typeof updateQuotaStageSchema['body']>
