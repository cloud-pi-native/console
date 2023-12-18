import { FromSchema } from 'json-schema-to-ts'
import { permissionOpenApiSchema } from '../../openApiSchemas/permission.js'

export type PermissionModel = FromSchema<typeof permissionOpenApiSchema>
