import { defineStore } from 'pinia'
import type { PermissionTarget, PluginsUpdateBody, Project, ProjectService } from '@cpn-console/shared'
import api from '@/api/index.js'

export const useProjectServiceStore = defineStore('serviceProject', () => {
  const services: ProjectService[] = []
  const getProjectServices = async (projectId: Project['id'], permissionTarget: PermissionTarget = 'user') => {
    const res = await api.getProjectServices(projectId, permissionTarget)
    if (!res) return []
    return res
  }
  const updateProjectServices = async (data: PluginsUpdateBody, projectId: Project['id']) => {
    return api.updateProjectServices(projectId, data)
  }

  return {
    services,
    getProjectServices,
    updateProjectServices,
  }
})
