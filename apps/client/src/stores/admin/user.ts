import { defineStore } from 'pinia'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useAdminUserStore = defineStore('admin-user', () => {
  const getAllUsers = () =>
    apiClient.UsersAdmin.getAllUsers()
      .then(response => extractData(response, 200))

  const updateUserAdminRole = (userId: string, isAdmin: boolean) =>
    apiClient.UsersAdmin.updateUserAdminRole({ params: { userId }, body: { isAdmin } })
      .then(response => extractData(response, 204))

  return {
    getAllUsers,
    updateUserAdminRole,
  }
})
