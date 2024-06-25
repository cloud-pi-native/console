import { defineStore } from 'pinia'
import type { PermissionTarget, PluginsUpdateBody, Project, ProjectService } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectServiceStore = defineStore('serviceProject', () => {
  const services: ProjectService[] = []

  const getProjectServices = (projectId: Project['id'], permissionTarget: PermissionTarget = 'user') =>
    apiClient.ProjectServices.getServices({ params: { projectId }, query: { permissionTarget } })
      .then(response => extractData(response, 200))

  const updateProjectServices = (body: PluginsUpdateBody, projectId: Project['id']) =>
    apiClient.ProjectServices.updateProjectServices({ params: { projectId }, body })
      .then(response => extractData(response, 204))

  return {
    services,
    getProjectServices,
    updateProjectServices,
  }
})
