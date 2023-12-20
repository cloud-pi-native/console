import { FromSchema } from 'json-schema-to-ts'
import { stageOpenApiSchema } from './openApiSchema.js'

export type StageModel = FromSchema<typeof stageOpenApiSchema>
