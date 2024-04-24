import { defineStore } from 'pinia'
import type { CreatePermissionBody, UpdatePermissionBody } from '@cpn-console/shared'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import { projectMissing } from '@/utils/const.js'

export const useProjectPermissionStore = defineStore('project-permission', () => {
  const projectStore = useProjectStore()

  const addPermission = async (environmentId: string, newPermission: CreatePermissionBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.addPermission(projectStore.selectedProject.id, environmentId, newPermission)
    await projectStore.getUserProjects()
  }

  const updatePermission = async (environmentId: string, permission: UpdatePermissionBody) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.updatePermission(projectStore.selectedProject.id, environmentId, permission)
    await projectStore.getUserProjects()
  }

  const deletePermission = async (environmentId: string, userId: string) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.deletePermission(projectStore.selectedProject.id, environmentId, userId)
    await projectStore.getUserProjects()
  }

  return {
    addPermission,
    updatePermission,
    deletePermission,
  }
})
