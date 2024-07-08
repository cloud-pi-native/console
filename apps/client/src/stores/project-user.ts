import { defineStore } from 'pinia'
import { useProjectStore } from '@/stores/project.js'
import type { AddUserToProjectBody } from '@cpn-console/shared'
import { useUsersStore } from './users.js'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectUserStore = defineStore('project-user', () => {
  const projectStore = useProjectStore()
  const usersStore = useUsersStore()

  const getMatchingUsers = async (projectId: string, letters: string) => {
    const users = await apiClient.Users.getMatchingUsers({ params: { projectId }, query: { letters } })
      .then(response => extractData(response, 200))
    usersStore.addUsers(users)
    return users
  }

  const addUserToProject = async (projectId: string, body: AddUserToProjectBody) => {
    const newRoles = await apiClient.Users.createUserRoleInProject({ body, params: { projectId } })
      .then(response => extractData(response, 201))
    newRoles.forEach(role => {
      usersStore.addUser(role.user)
    })
    projectStore.updateProjectRoles(projectId, newRoles)
    return newRoles
  }

  const transferProjectOwnership = async (projectId: string, userId: string) => {
    const newRoles = await apiClient.Users.transferProjectOwnership({ params: { projectId, userId } })
      .then(response => extractData(response, 200))
    if (!newRoles) return
    projectStore.updateProjectRoles(projectId, newRoles)
    return newRoles
  }

  const removeUserFromProject = async (projectId: string, userId: string) => {
    const newRoles = await apiClient.Users.deleteUserRoleInProject({ params: { projectId, userId } })
      .then(response => extractData(response, 200))
    projectStore.updateProjectRoles(projectId, newRoles)
    return newRoles
  }

  return {
    getMatchingUsers,
    addUserToProject,
    transferProjectOwnership,
    removeUserFromProject,
  }
})
