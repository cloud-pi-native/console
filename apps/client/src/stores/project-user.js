import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'

export const useProjectUserStore = defineStore('project-user', () => {
  const projectStore = useProjectStore()

  const getMatchingUsers = async (letters) => {
    return await api.getMatchingUsers(projectStore.selectedProject.id, letters)
  }

  const addUserToProject = async (user) => {
    await api.addUser(projectStore.selectedProject.id, user)
    await projectStore.getUserProjects()
  }

  const removeUserFromProject = async (userId) => {
    await api.removeUser(projectStore.selectedProject.id, userId)
    await projectStore.getUserProjects()
  }

  return {
    getMatchingUsers,
    addUserToProject,
    removeUserFromProject,
  }
})
