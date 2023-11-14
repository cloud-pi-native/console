import { FromSchema } from 'json-schema-to-ts'
import { organizationOpenApiSchema } from './index.js'

export type OrganizationModel = FromSchema<typeof organizationOpenApiSchema>
