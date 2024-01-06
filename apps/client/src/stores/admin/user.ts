import { defineStore } from 'pinia'
import { apiClient } from '@/api/xhr-client.js'

export const useAdminUserStore = defineStore('admin-user', () => {
  const getAllUsers = async () => {
    return (await apiClient.v1AdminUsersList()).data
  }

  return {
    getAllUsers,
  }
})
