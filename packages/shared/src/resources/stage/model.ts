import { FromSchema } from 'json-schema-to-ts'
import { stageOpenApiSchema } from '../../openApiSchemas/stage.js'

export type StageModel = FromSchema<typeof stageOpenApiSchema>
