import type { AddUserToProjectBody, LettersQuery, UpdateUserRoleInProjectBody } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const getMatchingUsers = (projectId: string, letters: LettersQuery['letters']) =>
  apiClient.Users.getMatchingUsers({ params: { projectId }, query: { letters } })
    .then(response => extractData(response, 200))

export const addUserToProject = (projectId: string, data: AddUserToProjectBody) =>
  apiClient.Users.createUserRoleInProject({ body: data, params: { projectId } })
    .then(response => extractData(response, 201))

export const updateUserProjectRole = (projectId: string, userId: string, data: UpdateUserRoleInProjectBody) =>
  apiClient.Users.updateUserRoleInProject({ body: data, params: { projectId, userId } })
    .then(response => extractData(response, 200))

export const getProjectUsers = (projectId: string) =>
  apiClient.Users.getProjectUsers({ params: { projectId } })
    .then(response => extractData(response, 200))

export const removeUser = (projectId: string, userId: string) =>
  apiClient.Users.deleteUserRoleInProject({ params: { projectId, userId } })
    .then(response => extractData(response, 200))

// Admin
export const getAllUsers = () =>
  apiClient.UsersAdmin.getAllUsers()
    .then(response => extractData(response, 200))

export const updateUserAdminRole = (userId: string, isAdmin: boolean) =>
  apiClient.UsersAdmin.updateUserAdminRole({ params: { userId }, body: { isAdmin } })
    .then(response => extractData(response, 204))
