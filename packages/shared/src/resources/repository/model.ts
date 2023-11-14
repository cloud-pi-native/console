import { FromSchema } from 'json-schema-to-ts'
import { repositoryOpenApiSchema } from './index.js'

export type RepositoryModel = FromSchema<typeof repositoryOpenApiSchema>
