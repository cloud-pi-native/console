import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'

export const useProjectPermissionStore = defineStore('project-permission', () => {
  const projectStore = useProjectStore()

  const addPermission = async (environmentId, newPermission) => {
    await api.addPermission(projectStore.selectedProject.value.id, environmentId, newPermission)
    await projectStore.getUserProjects()
  }

  const updatePermission = async (environmentId, permission) => {
    await api.updatePermission(projectStore.selectedProject.value.id, environmentId, permission)
    await projectStore.getUserProjects()
  }

  const deletePermission = async (environmentId, userId) => {
    await api.deletePermission(projectStore.selectedProject.value.id, environmentId, userId)
    await projectStore.getUserProjects()
  }

  return {
    addPermission,
    updatePermission,
    deletePermission,
  }
})
