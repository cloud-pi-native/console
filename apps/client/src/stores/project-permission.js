import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'

export const useProjectPermissionStore = defineStore('project-permission', () => {
  const addPermission = async (environmentId, newPermission) => {
    await api.addPermission(useProjectStore.selectedProject.value.id, environmentId, newPermission)
    await useProjectStore.getUserProjects()
  }

  const updatePermission = async (environmentId, permission) => {
    await api.updatePermission(useProjectStore.selectedProject.value.id, environmentId, permission)
    await useProjectStore.getUserProjects()
  }

  const deletePermission = async (environmentId, userId) => {
    await api.deletePermission(useProjectStore.selectedProject.value.id, environmentId, userId)
    await useProjectStore.getUserProjects()
  }

  return {
    addPermission,
    updatePermission,
    deletePermission,
  }
})
