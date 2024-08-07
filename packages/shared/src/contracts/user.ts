import { ClientInferRequest, ClientInferResponseBody } from '@ts-rest/core'
import { apiPrefix, contractInstance } from '../api-client.js'
import {
  CreateUserRoleInProjectSchema,
  GetAllUsersSchema,
  GetMatchingUsersSchema,
  GetProjectUsersSchema,
  UpdateUserAdminRoleSchema,
  TransferProjectOwnershipSchema,
  LoginSchema,
} from '../schemas/index.js'

export const userContract = contractInstance.router({
  getProjectUsers: {
    method: 'GET',
    path: `${apiPrefix}/projects/:projectId/users`,
    pathParams: GetProjectUsersSchema.params,
    summary: 'Get project users',
    description: 'Retrieved all project users.',
    responses: GetProjectUsersSchema.responses,
  },

  getMatchingUsers: {
    method: 'GET',
    path: `${apiPrefix}/projects/:projectId/users/match`,
    pathParams: GetMatchingUsersSchema.params,
    query: GetMatchingUsersSchema.query,
    summary: 'Get project users by letters matching',
    description: 'Retrieved all project users by letters matching.',
    responses: GetMatchingUsersSchema.responses,
  },

  createUserRoleInProject: {
    method: 'POST',
    path: `${apiPrefix}/projects/:projectId/users`,
    pathParams: GetProjectUsersSchema.params,
    body: CreateUserRoleInProjectSchema.body,
    contentType: 'application/json',
    summary: 'Create user role in project',
    description: 'Create user role in project.',
    responses: CreateUserRoleInProjectSchema.responses,
  },

  transferProjectOwnership: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId/users/:userId`,
    pathParams: TransferProjectOwnershipSchema.params,
    body: null,
    contentType: 'application/json',
    summary: 'Update user role in project',
    description: 'Update user role in project.',
    responses: TransferProjectOwnershipSchema.responses,
  },

  deleteUserRoleInProject: {
    method: 'DELETE',
    path: `${apiPrefix}/projects/:projectId/users/:userId`,
    pathParams: TransferProjectOwnershipSchema.params,
    body: null,
    summary: 'Delete user role in project',
    description: 'Delete user role in project.',
    responses: TransferProjectOwnershipSchema.responses,
  },

  auth: {
    method: 'GET',
    path: `${apiPrefix}/auth`,
    summary: 'Login',
    description: 'OIDC callback to signin or signup',
    responses: LoginSchema.responses,
  },

  getAllUsers: {
    method: 'GET',
    path: `${apiPrefix}/users`,
    summary: 'Get all users',
    description: 'Get all users.',
    responses: GetAllUsersSchema.responses,
  },

  updateUserAdminRole: {
    method: 'PUT',
    path: `${apiPrefix}/users/:userId`,
    summary: 'Update user admin role',
    pathParams: UpdateUserAdminRoleSchema.params,
    body: UpdateUserAdminRoleSchema.body,
    description: 'Update user admin role.',
    responses: UpdateUserAdminRoleSchema.responses,
  },
})

export type AddUserToProjectBody = ClientInferRequest<typeof userContract.createUserRoleInProject>['body']

export type LettersQuery = ClientInferRequest<typeof userContract.getMatchingUsers>['query']

export type Users = ClientInferResponseBody<typeof userContract.getProjectUsers, 200>

export type AllUsers = ClientInferResponseBody<typeof userContract.getAllUsers, 200>
