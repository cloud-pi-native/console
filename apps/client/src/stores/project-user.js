import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'

export const useProjectUserStore = defineStore('project-user', () => {
  const projectStore = useProjectStore()

  const addUserToProject = async (newUser) => {
    await api.addUser(projectStore.selectedProject.value.id, newUser)
    await projectStore.getUserProjects()
  }

  const removeUserFromProject = async (userId) => {
    await api.removeUser(projectStore.selectedProject.value.id, userId)
    await projectStore.getUserProjects()
  }

  return {
    addUserToProject,
    removeUserFromProject,
  }
})
