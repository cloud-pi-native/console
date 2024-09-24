import type { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  RoleNameCsvSchema,
  UserSchema,
} from '../schemas/index.js'
import { UuidOrCsvUuidSchema } from '../schemas/_utils.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const userContract = contractInstance.router({
  getMatchingUsers: {
    method: 'GET',
    path: `${apiPrefix}/users/matching`,
    query: z.object({
      letters: z.string(),
      notInProjectId: z.string().uuid().optional(),
    }),
    summary: 'Get users by letters matching',
    description: 'Retrieved users by letters matching.',
    responses: {
      200: UserSchema.array(),
      400: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  auth: {
    method: 'GET',
    path: `${apiPrefix}/auth`,
    summary: 'Login',
    description: 'OIDC callback to signin or signup',
    responses: {
      200: UserSchema,
      307: null,
      500: ErrorSchema,
    },
  },

  getAllUsers: {
    method: 'GET',
    path: `${apiPrefix}/users`,
    summary: 'Get all users',
    description: 'Get all users.',
    query: z.object({
      adminRoles: RoleNameCsvSchema
        .optional(),
      adminRoleIds: UuidOrCsvUuidSchema
        .optional(),
      memberOfIds: UuidOrCsvUuidSchema
        .optional(),
      relationType: z.enum(['OR', 'AND'])
        .optional(),
    }),
    responses: {
      200: UserSchema.array(),
      400: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },

  patchUsers: {
    method: 'PATCH',
    path: `${apiPrefix}/users`,
    summary: 'Patch users',
    body: UserSchema.pick({ adminRoleIds: true, id: true }).array(),
    description: 'Update user admin role.',
    responses: {
      200: UserSchema.array(),
      400: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema,
    },
  },
}, {
  baseHeaders,
})

export type LettersQuery = ClientInferRequest<typeof userContract.getMatchingUsers>['query']

export type AllUsers = ClientInferResponseBody<typeof userContract.getAllUsers, 200>
