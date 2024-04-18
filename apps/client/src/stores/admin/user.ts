import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useAdminUserStore = defineStore('admin-user', () => {
  const getAllUsers = async () => {
    return api.getAllUsers()
  }

  return {
    getAllUsers,
  }
})
