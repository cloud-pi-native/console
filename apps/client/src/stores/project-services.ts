import { defineStore } from 'pinia'
import type { PermissionTarget, PluginsUpdateBody, ProjectService, ProjectV2 } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectServiceStore = defineStore('serviceProject', () => {
  const services: ProjectService[] = []

  const getProjectServices = (projectId: ProjectV2['id'], permissionTarget: PermissionTarget = 'user') =>
    apiClient.ProjectServices.getServices({ params: { projectId }, query: { permissionTarget } })
      .then(response => extractData(response, 200))

  const updateProjectServices = (body: PluginsUpdateBody, projectId: ProjectV2['id']) =>
    apiClient.ProjectServices.updateProjectServices({ params: { projectId }, body })
      .then(response => extractData(response, 204))

  return {
    services,
    getProjectServices,
    updateProjectServices,
  }
})
