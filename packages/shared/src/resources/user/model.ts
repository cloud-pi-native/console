import { FromSchema } from 'json-schema-to-ts'
import { roleOpenApiSchema, userOpenApiSchema } from './index.js'

export type UserModel = FromSchema<typeof userOpenApiSchema>

export type RoleModel = FromSchema<typeof roleOpenApiSchema>
