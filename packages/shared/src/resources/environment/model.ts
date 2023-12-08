import { FromSchema } from 'json-schema-to-ts'
import { environmentOpenApiSchema } from './index.js'

export type EnvironmentModel = FromSchema<typeof environmentOpenApiSchema>
