import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useAdminProjectStore = defineStore('admin-project', () => {
  const getAllProjects = async () => {
    return api.getAllProjects()
  }

  return {
    getAllProjects,
  }
})
