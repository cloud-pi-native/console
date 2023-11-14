import { FromSchema } from 'json-schema-to-ts'
import { permissionOpenApiSchema } from './index.js'

export type PermissionModel = FromSchema<typeof permissionOpenApiSchema>
