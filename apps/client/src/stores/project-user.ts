import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import type { AddUserToProjectDto, RoleParams, UserParams } from '@dso-console/shared'

export const useProjectUserStore = defineStore('project-user', () => {
  const projectStore = useProjectStore()

  const getMatchingUsers = async (projectId: string, letters: string) => {
    return await api.getMatchingUsers(projectId, letters)
  }

  const addUserToProject = async (projectId: UserParams['projectId'], user: AddUserToProjectDto) => {
    await api.addUserToProject(projectId, user)
    await projectStore.getUserProjects()
  }

  const removeUserFromProject = async (projectId: RoleParams['projectId'], userId: RoleParams['userId']) => {
    await api.removeUser(projectId, userId)
    await projectStore.getUserProjects()
  }

  return {
    getMatchingUsers,
    addUserToProject,
    removeUserFromProject,
  }
})
