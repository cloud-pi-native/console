import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/index.js'
import type { GetLogsQuery, Log } from '@cpn-console/shared'

export const useAdminLogStore = defineStore('admin-log', () => {
  const logs = ref<Log[]>([])
  const count = ref<number | undefined>(undefined)

  const getAllLogs = async ({ offset, limit }: GetLogsQuery = { offset: 0, limit: 100 }) => {
    const res = await api.getAllLogs({ offset, limit })
    if (!res) return
    count.value = res.total
    logs.value = res.logs
  }

  return {
    logs,
    count,
    getAllLogs,
  }
})
