import { defineStore } from 'pinia'
import type { CreatePermissionBody, UpdatePermissionBody } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { projectMissing } from '@/utils/const.js'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectPermissionStore = defineStore('project-permission', () => {
  const projectStore = useProjectStore()

  const addPermission = async (environmentId: string, newPermission: CreatePermissionBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Permissions.createPermission({ body: newPermission, params: { projectId: projectStore.selectedProject.id, environmentId } })
      .then(response => extractData(response, 201))
    await projectStore.getUserProjects()
  }

  const updatePermission = async (environmentId: string, permission: UpdatePermissionBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Permissions.updatePermission({ body: permission, params: { projectId: projectStore.selectedProject.id, environmentId } })
      .then(response => extractData(response, 200))
    await projectStore.getUserProjects()
  }

  const deletePermission = async (environmentId: string, userId: string) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await apiClient.Permissions.deletePermission({ params: { projectId: projectStore.selectedProject.id, environmentId, userId } })
      .then(response => extractData(response, 204))
    await projectStore.getUserProjects()
  }

  return {
    addPermission,
    updatePermission,
    deletePermission,
  }
})
