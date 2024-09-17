import { defineStore } from 'pinia'
import type { userContract } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useUsersStore = defineStore('users', () => {
  const listUsers = async (query: typeof userContract.getAllUsers.query._input) =>
    apiClient.Users.getAllUsers({ query })
      .then(res => extractData(res, 200))

  const listMatchingUsers = async (query: typeof userContract.getMatchingUsers.query._type) =>
    apiClient.Users.getMatchingUsers({ query })
      .then(res => extractData(res, 200))

  const patchUsers = async (body: typeof userContract.patchUsers.body._type) =>
    apiClient.Users.patchUsers({ body })
      .then(res => extractData(res, 200))

  return {
    listUsers,
    listMatchingUsers,
    patchUsers,
  }
})
