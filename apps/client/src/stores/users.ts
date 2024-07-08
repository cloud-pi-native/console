import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@cpn-console/shared'

export const useUsersStore = defineStore('users', () => {
  const users = ref<Record<string, User>>({})

  const addUser = (user: User) => {
    users.value = {
      ...users.value,
      [user.id]: user,
    }
  }

  const addUserFromMember = ({ userId: id, ...member }: Omit<User, 'id'> & { userId: User['id'] }) => {
    users.value = {
      ...users.value,
      [id]: { id, ...member },
    }
  }

  const addUsersFromMembers = (members: (Omit<User, 'id'> & { userId: User['id'] })[]) => {
    for (const member of members) {
      addUserFromMember(member)
    }
  }

  const addUsers = (users: User[]) => {
    for (const user of users) {
      addUser(user)
    }
  }

  return {
    users,
    addUser,
    addUsers,
    addUserFromMember,
    addUsersFromMembers,
  }
})
