import { defineStore } from 'pinia'
import api from '@/api/index.js'
import type { UserModel } from '@dso-console/shared'

export const useAdminUserStore = defineStore('admin-user', () => {
  const getAllUsers = async (): Promise<Array<UserModel>> => {
    return api.getAllUsers()
  }

  return {
    getAllUsers,
  }
})
