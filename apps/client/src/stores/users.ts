import { users as usersApi } from '@/api/index.js'
import type { ProjectParams, UserModel } from '@cpn-console/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'

type UserOutputDto = Required<UserModel>

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

  const getProjectUsers = async (projectId: ProjectParams['projectId']) => {
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
