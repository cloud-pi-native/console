import { users as usersApi } from '@/api/index.js'
import type { User } from '@cpn-console/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'

type UserOutputDto = Required<User>

export const useUsersStore = defineStore('users', () => {
  const users = ref<Record<string, UserOutputDto>>({})

  const addUser = (user: UserOutputDto) => {
    users.value = {
      ...users.value,
      [user.id]: user,
    }
  }

  const addUsers = (users: UserOutputDto[]) => {
    for (const user of users) {
      addUser(user)
    }
  }

  const getProjectUsers = async (projectId: string) => {
    const usersToAdd = await usersApi.getProjectUsers(projectId)
    addUsers(usersToAdd)
  }

  return {
    users,
    addUser,
    addUsers,
    getProjectUsers,
  }
})
