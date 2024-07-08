import { defineStore } from 'pinia'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useAdminUserStore = defineStore('admin-user', () => {
  const getAllUsers = () =>
    apiClient.Users.getAllUsers()
      .then(response => extractData(response, 200))

  const updateUserAdminRole = (userId: string, isAdmin: boolean) =>
    apiClient.Users.updateUserAdminRole({ params: { userId }, body: { isAdmin } })
      .then(response => extractData(response, 204))

  return {
    getAllUsers,
    updateUserAdminRole,
  }
})
