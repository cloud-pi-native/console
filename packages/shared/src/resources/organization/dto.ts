import { FromSchema } from 'json-schema-to-ts'
import { createOrganizationSchema, updateOrganizationSchema } from './openApiSchema.js'

export type CreateOrganizationDto = FromSchema<typeof createOrganizationSchema['body']>

export type UpdateOrganizationDto = FromSchema<typeof updateOrganizationSchema['body']>

export type OrganizationParams = FromSchema<typeof updateOrganizationSchema['params']>
