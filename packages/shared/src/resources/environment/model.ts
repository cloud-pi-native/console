import { FromSchema } from 'json-schema-to-ts'
import { environmentOpenApiSchema } from '../../openApiSchemas/environment.js'

export type EnvironmentModel = FromSchema<typeof environmentOpenApiSchema>
