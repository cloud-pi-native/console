import type { AddUserToProjectDto, LettersQuery, RoleParams, UpdateUserProjectRoleDto, UserParams } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

// Admin - Users
export const getAllUsers = async () => {
  const response = await apiClient.UsersAdmin.getAllUsers()
  return response.body
}

// Users
export const getMatchingUsers = async (projectId: UserParams['projectId'], letters: LettersQuery['letters']) => {
  const response = await apiClient.Users.getMatchingUsers({ params: { projectId }, query: { letters } })
  return response.body
}

export const addUserToProject = async (projectId: UserParams['projectId'], data: AddUserToProjectDto) => {
  const response = await apiClient.Users.createUserRoleInProject({ body: data, params: { projectId } })
  return response.body
}

export const updateUserProjectRole = async (projectId: RoleParams['projectId'], userId: RoleParams['userId'], data: UpdateUserProjectRoleDto) => {
  const response = await apiClient.Users.updateUserRoleInProject({ body: data, params: { projectId, userId } })
  return response.body
}

export const getProjectUsers = async (projectId: UserParams['projectId']) => {
  const response = await apiClient.Users.getProjectUsers({ params: { projectId } })
  return response.body
}

export const removeUser = async (projectId: RoleParams['projectId'], userId: RoleParams['userId']) => {
  const response = await apiClient.Users.deleteUserRoleInProject({ params: { projectId, userId } })
  return response.body
}
