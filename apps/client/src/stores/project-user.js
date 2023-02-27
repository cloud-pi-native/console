import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'

export const useProjectUserStore = defineStore('project-user', () => {
  const addUserToProject = async (newUser) => {
    await api.addUser(useProjectStore.selectedProject.value.id, newUser)
    await useProjectStore.getUserProjects()
  }

  const removeUserFromProject = async (userId) => {
    await api.removeUser(useProjectStore.selectedProject.value.id, userId)
    await useProjectStore.getUserProjects()
  }

  return {
    addUserToProject,
    removeUserFromProject,
  }
})
