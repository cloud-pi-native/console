import { FromSchema } from 'json-schema-to-ts'
import { createStageSchema, getStageAssociatedEnvironmentsSchema, updateStageClustersSchema } from './openApiSchema.js'

export type CreateStageDto = FromSchema<typeof createStageSchema['body']>

export type UpdateStageClustersDto = FromSchema<typeof updateStageClustersSchema['body']>

export type StageParams = FromSchema<typeof getStageAssociatedEnvironmentsSchema['params']>
