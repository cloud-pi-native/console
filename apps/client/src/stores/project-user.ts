import { defineStore } from 'pinia'
import { useUsersStore } from './users.js'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useProjectUserStore = defineStore('project-user', () => {
  const usersStore = useUsersStore()

  const getAllUsers = () =>
    apiClient.Users.getAllUsers()
      .then(response => extractData(response, 200))

  const getMatchingUsers = async (projectId: string, letters: string) => {
    const users = await apiClient.Users.getMatchingUsers({ query: { letters, notInProjectId: projectId } })
      .then(response => extractData(response, 200))
    usersStore.addUsers(users)
    return users
  }

  const addMember = async (projectId: string, email: string) =>
    apiClient.ProjectsMembers.addMember({ params: { projectId }, body: { email } })
      .then(response => extractData(response, 201))

  const removeMember = async (projectId: string, userId: string) =>
    apiClient.ProjectsMembers.removeMember({ params: { projectId, userId } })
      .then(response => extractData(response, 200))

  return {
    getAllUsers,
    getMatchingUsers,
    addMember,
    removeMember,
  }
})
