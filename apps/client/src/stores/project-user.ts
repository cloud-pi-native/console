import { defineStore } from 'pinia'
import type { AddUserToProjectBody } from '@cpn-console/shared'
import { useUsersStore } from './users.js'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectUserStore = defineStore('project-user', () => {
  const usersStore = useUsersStore()

  const getAllUsers = () =>
    apiClient.Users.getAllUsers()
      .then(response => extractData(response, 200))

  const updateUserAdminRole = (userId: string, isAdmin: boolean) =>
    apiClient.Users.updateUserAdminRole({ params: { userId }, body: { isAdmin } })
      .then(response => extractData(response, 204))

  const getMatchingUsers = async (projectId: string, letters: string) => {
    const users = await apiClient.Users.getMatchingUsers({ params: { projectId }, query: { letters } })
      .then(response => extractData(response, 200))
    usersStore.addUsers(users)
    return users
  }

  const addUserToProject = async (projectId: string, body: AddUserToProjectBody) => {
    const newMembers = await apiClient.Users.createUserRoleInProject({ body, params: { projectId } })
      .then(response => extractData(response, 201))
    usersStore.addUsersFromMembers(newMembers)
    return newMembers
  }

  const transferProjectOwnership = async (projectId: string, userId: string) => apiClient.Users.transferProjectOwnership({ params: { projectId, userId } })
    .then(response => extractData(response, 200))

  const removeUserFromProject = async (projectId: string, userId: string) => apiClient.Users.deleteUserRoleInProject({ params: { projectId, userId } })
    .then(response => extractData(response, 200))

  return {
    getAllUsers,
    getMatchingUsers,
    addUserToProject,
    transferProjectOwnership,
    updateUserAdminRole,
    removeUserFromProject,
  }
})
