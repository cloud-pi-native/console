import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useAdminUserStore = defineStore('admin-user', () => {
  /**
   * Get all users via api
   * @returns list of users
   */
  const getAllUsers = async () => {
    return api.getAllUsers()
  }

  return {
    getAllUsers,
  }
})
