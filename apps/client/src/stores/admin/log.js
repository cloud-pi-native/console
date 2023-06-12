import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useAdminLogStore = defineStore('admin-log', () => {
  const getAllLogs = async ({ offset, limit } = { offset: 0, limit: 100 }) => {
    return api.getAllLogs({ offset, limit })
  }

  const countAllLogs = async () => {
    return api.countAllLogs()
  }

  return {
    getAllLogs,
    countAllLogs,
  }
})
