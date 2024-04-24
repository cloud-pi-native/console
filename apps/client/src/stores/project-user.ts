import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useProjectStore } from '@/stores/project.js'
import type { AddUserToProjectBody } from '@cpn-console/shared'
import { useUsersStore } from './users.js'

export const useProjectUserStore = defineStore('project-user', () => {
  const projectStore = useProjectStore()
  const usersStore = useUsersStore()

  const getMatchingUsers = async (projectId: string, letters: string) => {
    const users = await api.getMatchingUsers(projectId, letters)
    if (users) usersStore.addUsers(users)
    return users
  }

  const addUserToProject = async (projectId: string, user: AddUserToProjectBody) => {
    const newRoles = await api.addUserToProject(projectId, user)
    if (!newRoles) return
    newRoles.forEach(role => {
      usersStore.addUser(role.user)
    })
    projectStore.updateProjectRoles(projectId, newRoles)
    return newRoles
  }

  const removeUserFromProject = async (projectId: string, userId: string) => {
    const newRoles = await api.removeUser(projectId, userId)
    if (!newRoles) return
    projectStore.updateProjectRoles(projectId, newRoles)
    return newRoles
  }

  return {
    getMatchingUsers,
    addUserToProject,
    removeUserFromProject,
  }
})
