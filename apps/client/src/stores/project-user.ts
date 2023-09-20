import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import { UserModel } from '@dso-console/shared'
import { projectMissing } from '@/utils/const.js'

export const useProjectUserStore = defineStore('project-user', () => {
  const projectStore = useProjectStore()

  const getMatchingUsers = async (letters: string) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    return await api.getMatchingUsers(projectStore.selectedProject.id, letters)
  }

  const addUserToProject = async (user: UserModel) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.addUser(projectStore.selectedProject.id, user)
    await projectStore.getUserProjects()
  }

  const removeUserFromProject = async (userId: UserModel['id']) => {
    if (!projectStore.selectedProject) throw new Error(projectMissing)
    await api.removeUser(projectStore.selectedProject.id, userId)
    await projectStore.getUserProjects()
  }

  return {
    getMatchingUsers,
    addUserToProject,
    removeUserFromProject,
  }
})
