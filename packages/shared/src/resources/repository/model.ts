import { FromSchema } from 'json-schema-to-ts'
import { repositoryOpenApiSchema } from '../../openApiSchemas/repository.js'

export type RepositoryModel = FromSchema<typeof repositoryOpenApiSchema>
