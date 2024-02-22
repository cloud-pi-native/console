import { defineStore } from 'pinia'
import api from '@/api/index.js'
import type { UserModel } from '@cpn-console/shared'

export const useAdminUserStore = defineStore('admin-user', () => {
  const getAllUsers = async (): Promise<Array<UserModel>> => {
    return api.getAllUsers()
  }

  return {
    getAllUsers,
  }
})
