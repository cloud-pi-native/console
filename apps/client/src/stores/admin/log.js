import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'

export const useAdminLogStore = defineStore('admin-log', () => {
  const logs = ref([])
  const count = ref(undefined)

  const getAllLogs = async ({ offset, limit } = { offset: 0, limit: 100 }) => {
    const res = await api.getAllLogs({ offset, limit })
    count.value = res.total
    logs.value = res.logs
  }

  return {
    logs,
    count,
    getAllLogs,
  }
})
