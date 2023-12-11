import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import type { AddUserDto, UserModel } from '@dso-console/shared'

export const useProjectUserStore = defineStore('project-user', () => {
  const projectStore = useProjectStore()

  const getMatchingUsers = async (projectId: string, letters: string) => {
    return await api.getMatchingUsers(projectId, letters)
  }

  const addUserToProject = async (projectId: AddUserDto['params']['projectId'], user: AddUserDto['body']) => {
    await api.addUser(projectId, user)
    await projectStore.getUserProjects()
  }

  const removeUserFromProject = async (projectId: string, userId: UserModel['id']) => {
    await api.removeUser(projectId, userId)
    await projectStore.getUserProjects()
  }

  return {
    getMatchingUsers,
    addUserToProject,
    removeUserFromProject,
  }
})
