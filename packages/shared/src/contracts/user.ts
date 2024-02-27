import { apiPrefix, contractInstance } from '../api-client.js'
import {
  GetProjectUsersSchema,
  GetMatchingUsersSchema,
  CreateUserRoleInProjectSchema,
  UpdateUserRoleInProjectSchema,
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

  updateUserRoleInProject: {
    method: 'PUT',
    path: `${apiPrefix}/projects/:projectId/users/:userId`,
    pathParams: UpdateUserRoleInProjectSchema.params,
    body: UpdateUserRoleInProjectSchema.body,
    contentType: 'application/json',
    summary: 'Update user role in project',
    description: 'Update user role in project.',
    responses: UpdateUserRoleInProjectSchema.responses,
  },

  deleteUserRoleInProject: {
    method: 'DELETE',
    path: `${apiPrefix}/projects/:projectId/users/:userId`,
    pathParams: UpdateUserRoleInProjectSchema.params,
    body: null,
    contentType: 'application/json',
    summary: 'Delete user role in project',
    description: 'Delete user role in project.',
    responses: UpdateUserRoleInProjectSchema.responses,
  },
})

export const userAdminContract = contractInstance.router({
  getAllUsers: {
    method: 'GET',
    path: `${apiPrefix}/admin/users`,
    summary: 'Get all users',
    description: 'Get all users.',
    responses: GetProjectUsersSchema.responses,
  },
})
