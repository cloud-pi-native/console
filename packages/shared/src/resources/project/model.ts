import { FromSchema } from 'json-schema-to-ts'
import { projectOpenApiSchema, serviceOpenApiSchema } from '../../openApiSchemas/project.js'

export type ProjectModel = FromSchema<typeof projectOpenApiSchema>

export type ServiceModel = FromSchema<typeof serviceOpenApiSchema>
