import { defineStore } from 'pinia'
import type { User, userContract } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useUsersStore = defineStore('users', () => {
  const listUsers = async (query: typeof userContract.listUsers.query._input) =>
    apiClient.Users.listUsers({ query })
      .then(res => extractData(res, 200))

  const getUser = async (id: User['id']) =>
    apiClient.Users.getUser({ params: { id } })
      .then(res => extractData(res, 200))

  const listMatchingUsers = async (query: typeof userContract.getMatchingUsers.query._type) =>
    apiClient.Users.getMatchingUsers({ query })
      .then(res => extractData(res, 200))

  const patchUsers = async (body: typeof userContract.patchUsers.body._type) =>
    apiClient.Users.patchUsers({ body })
      .then(res => extractData(res, 200))

  return {
    getUser,
    listUsers,
    listMatchingUsers,
    patchUsers,
  }
})
