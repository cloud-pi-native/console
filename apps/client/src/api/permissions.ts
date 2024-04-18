import type { CreatePermissionBody, UpdatePermissionBody } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const addPermission = async (projectId: string, environmentId: string, data: CreatePermissionBody) => {
  const response = await apiClient.Permissions.createPermission({ body: data, params: { projectId, environmentId } })
  if (response.status === 201) return response.body
}

export const updatePermission = async (projectId: string, environmentId: string, data: UpdatePermissionBody) => {
  const response = await apiClient.Permissions.updatePermission({ body: data, params: { projectId, environmentId } })
  if (response.status === 200) return response.body
}

export const getPermissions = async (projectId: string, environmentId: string) => {
  const response = await apiClient.Permissions.getPermissions({ params: { projectId, environmentId } })
  if (response.status === 200) return response.body
}

export const deletePermission = async (projectId: string, environmentId: string, userId: string) => {
  const response = await apiClient.Permissions.deletePermission({ params: { projectId, environmentId, userId } })
  if (response.status === 204) return response.body
}
