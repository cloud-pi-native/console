import { FromSchema } from 'json-schema-to-ts'
import { organizationOpenApiSchema } from '../../openApiSchemas/organization.js'

export type OrganizationModel = FromSchema<typeof organizationOpenApiSchema>
