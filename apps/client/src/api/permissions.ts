import type { CreatePermissionBody, UpdatePermissionBody } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const addPermission = (projectId: string, environmentId: string, data: CreatePermissionBody) =>
  apiClient.Permissions.createPermission({ body: data, params: { projectId, environmentId } })
    .then(response => extractData(response, 201))

export const updatePermission = (projectId: string, environmentId: string, data: UpdatePermissionBody) =>
  apiClient.Permissions.updatePermission({ body: data, params: { projectId, environmentId } })
    .then(response => extractData(response, 200))

export const getPermissions = (projectId: string, environmentId: string) =>
  apiClient.Permissions.getPermissions({ params: { projectId, environmentId } })
    .then(response => extractData(response, 200))

export const deletePermission = (projectId: string, environmentId: string, userId: string) =>
  apiClient.Permissions.deletePermission({ params: { projectId, environmentId, userId } })
    .then(response => extractData(response, 204))
