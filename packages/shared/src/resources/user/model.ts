import { FromSchema } from 'json-schema-to-ts'
import { roleOpenApiSchema, userOpenApiSchema } from '../../openApiSchemas/user.js'

export type UserModel = FromSchema<typeof userOpenApiSchema>

export type RoleModel = FromSchema<typeof roleOpenApiSchema>
