import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useAdminUserStore = defineStore('admin-user', () => {
  const getAllUsers = async () => {
    return api.getAllUsers()
  }

  const updateUserAdminRole = async (userId: string, isAdmin: boolean) => {
    return api.updateUserAdminRole(userId, isAdmin)
  }

  return {
    getAllUsers,
    updateUserAdminRole,
  }
})
