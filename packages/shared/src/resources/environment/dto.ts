import { FromSchema } from 'json-schema-to-ts'
import { initializeEnvironmentSchema, updateEnvironmentSchema } from './openApiSchema.js'

export type InitializeEnvironmentDto = FromSchema<typeof initializeEnvironmentSchema['body']>

export type UpdateEnvironmentDto = FromSchema<typeof updateEnvironmentSchema['body']>

export type EnvironmentParams = FromSchema<typeof updateEnvironmentSchema['params']>

export type InitializeEnvironmentParams = FromSchema<typeof initializeEnvironmentSchema['params']>
