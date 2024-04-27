import type { PermissionTarget } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const getProjectServices = async (projectId: string, permissionTarget: PermissionTarget) => {
  const response = await apiClient.ProjectServices.getServices({ params: { projectId }, query: { permissionTarget } })
  if (response.status === 200) return response.body
}

export const updateProjectServices = async (projectId: string, body: any) => {
  const response = await apiClient.ProjectServices.updateProjectServices({ params: { projectId }, body })
  if (response.status === 204) return response.body
}
