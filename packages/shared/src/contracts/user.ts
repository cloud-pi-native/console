import { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  GetMatchingUsersSchema,
  UserSchema,
} from '../schemas/index.js'
import { z } from 'zod'
import { ErrorSchema } from '../schemas/utils.js'

export const userContract = contractInstance.router({
  getMatchingUsers: {
    method: 'GET',
    path: `${apiPrefix}/users/matching`,
    query: GetMatchingUsersSchema.query,
    summary: 'Get users by letters matching',
    description: 'Retrieved users by letters matching.',
    responses: {
      200: z.lazy(() => UserSchema.array()),
      400: ErrorSchema,
      403: ErrorSchema,
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
      adminRoleId: z.string().uuid().optional(),
    }),
    responses: {
      200: z.lazy(() => UserSchema.array()),
      400: ErrorSchema,
      403: ErrorSchema,
    },
  },

  // patchUsers: {
  //   method: 'PATCH',
  //   path: `${apiPrefix}/users`,
  //   summary: 'Patch users',
  //   body: z.lazy(() => UserSchema.pick({ adminRoleIds: true, id: true }).array()),
  //   description: 'Update user admin role.',
  //   responses: {
  //     200: z.lazy(() => UserSchema.array()),
  //     400: ErrorSchema,
  //     403: ErrorSchema,
  //   },
  // },
})

export type LettersQuery = ClientInferRequest<typeof userContract.getMatchingUsers>['query']

export type AllUsers = ClientInferResponseBody<typeof userContract.getAllUsers, 200>
