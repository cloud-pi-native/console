import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useUsersStore = defineStore('users', () => {
  const users = ref<Record<string, User>>({})

  const addUser = (user: User) => {
    users.value = {
      ...users.value,
      [user.id]: user,
    }
  }

  const addUsers = (users: User[]) => {
    for (const user of users) {
      addUser(user)
    }
  }

  const getProjectUsers = async (projectId: string) => {
    const usersToAdd = await apiClient.Users.getProjectUsers({ params: { projectId } })
      .then(response => extractData(response, 200))
    addUsers(usersToAdd)
  }

  return {
    users,
    addUser,
    addUsers,
    getProjectUsers,
  }
})
