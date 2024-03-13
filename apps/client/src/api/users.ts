import type { AddUserToProjectDto, AddUserToProjectOutputDto, LettersQuery, RoleParams, UpdateUserProjectRoleDto, UserModel, UserParams } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

// Admin - Users
export const getAllUsers = async () => {
  const response = await apiClient.get('/admin/users')
  return response.data
}

// Users
export const getMatchingUsers = async (projectId: UserParams['projectId'], letters: LettersQuery['letters']) => {
  const response = await apiClient.get(`/projects/${projectId}/users/match?letters=${letters}`)
  return response.data
}

export const addUserToProject = async (projectId: UserParams['projectId'], data: AddUserToProjectDto): Promise<AddUserToProjectOutputDto> => {
  const response = await apiClient.post(`/projects/${projectId}/users`, data)
  return response.data
}

export const updateUserProjectRole = async (projectId: RoleParams['projectId'], userId: RoleParams['userId'], data: UpdateUserProjectRoleDto): Promise<AddUserToProjectOutputDto> => {
  const response = await apiClient.put(`/projects/${projectId}/users/${userId}`, data)
  return response.data
}

export const getProjectUsers = async (projectId: UserParams['projectId']): Promise<Required<UserModel>[]> => {
  const response = await apiClient.get(`/projects/${projectId}/users`)
  return response.data
}

export const removeUser = async (projectId: RoleParams['projectId'], userId: RoleParams['userId']): Promise<AddUserToProjectOutputDto> => {
  const response = await apiClient.delete(`/projects/${projectId}/users/${userId}`)
  return response.data
}
