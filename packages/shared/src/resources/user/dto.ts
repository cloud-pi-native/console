import { FromSchema } from 'json-schema-to-ts'
import { addUserToProjectSchema, getMatchingUsersSchema, getProjectUsersSchema, updateUserProjectRoleSchema } from './openApiSchema.js'

export type AddUserToProjectDto = FromSchema<typeof addUserToProjectSchema['body']>

export type UpdateUserProjectRoleDto = FromSchema<typeof updateUserProjectRoleSchema['body']>

export type LettersQuery = FromSchema<typeof getMatchingUsersSchema['query']>

export type UserParams = FromSchema<typeof getProjectUsersSchema['params']>

export type RoleParams = FromSchema<typeof updateUserProjectRoleSchema['params']>
