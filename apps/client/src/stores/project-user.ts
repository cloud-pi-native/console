import { defineStore } from 'pinia'

import type { AddUserToProjectDto, RoleParams, UserModel, UserParams } from '@dso-console/shared'

import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import { useUsersStore } from './users.js'

export const useProjectUserStore = defineStore('project-user', () => {
  const projectStore = useProjectStore()
  const usersStore = useUsersStore()

  const getMatchingUsers = async (projectId: string, letters: string): Promise<Required<UserModel>[]> => {
    const users = await api.getMatchingUsers(projectId, letters)
    usersStore.addUsers(users)
    return users
  }

  const addUserToProject = async (projectId: UserParams['projectId'], user: AddUserToProjectDto) => {
    const newRoles = await api.addUserToProject(projectId, user)
    projectStore.updateProjectRoles(projectId, newRoles)
    return newRoles
  }

  const removeUserFromProject = async (projectId: RoleParams['projectId'], userId: RoleParams['userId']) => {
    const newRoles = await api.removeUser(projectId, userId)
    projectStore.updateProjectRoles(projectId, newRoles)
    return newRoles
  }

  return {
    getMatchingUsers,
    addUserToProject,
    removeUserFromProject,
  }
})
