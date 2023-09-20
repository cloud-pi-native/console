import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import { EnvironmentModel, PermissionModel, UserModel } from '@dso-console/shared'
import { projectMissing } from '@/utils/const.js'

export const useProjectPermissionStore = defineStore('project-permission', () => {
  const projectStore = useProjectStore()

  const addPermission = async (environmentId: EnvironmentModel['id'], newPermission: PermissionModel) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.addPermission(projectStore.selectedProject.id, environmentId, newPermission)
    await projectStore.getUserProjects()
  }

  const updatePermission = async (environmentId: EnvironmentModel['id'], permission: PermissionModel) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.updatePermission(projectStore.selectedProject.id, environmentId, permission)
    await projectStore.getUserProjects()
  }

  const deletePermission = async (environmentId: EnvironmentModel['id'], userId: UserModel['id']) => {
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
