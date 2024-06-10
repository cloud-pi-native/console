import type { PermissionTarget } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const getProjectServices = (projectId: string, permissionTarget: PermissionTarget) =>
  apiClient.ProjectServices.getServices({ params: { projectId }, query: { permissionTarget } })
    .then(response => extractData(response, 200))

export const updateProjectServices = (projectId: string, body: any) =>
  apiClient.ProjectServices.updateProjectServices({ params: { projectId }, body })
    .then(response => extractData(response, 204))
