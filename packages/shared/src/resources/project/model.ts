import { FromSchema } from 'json-schema-to-ts'
import { projectOpenApiSchema, serviceOpenApiSchema } from './index.js'

export type ProjectModel = FromSchema<typeof projectOpenApiSchema>

export type ServiceModel = FromSchema<typeof serviceOpenApiSchema>
