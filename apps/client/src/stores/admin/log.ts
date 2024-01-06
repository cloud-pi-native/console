import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/xhr-client.js'
import type { AdminLogsQuery, LogModel } from '@dso-console/shared'

export const useAdminLogStore = defineStore('admin-log', () => {
  const logs = ref<LogModel[]>([])
  const count = ref<number>(0)

  const getAllLogs = async ({ offset, limit }: AdminLogsQuery = { offset: 0, limit: 100 }) => {
    // TODO
    const res = await apiClient.v1AdminLogsList({ offset, limit })
    count.value = res.total
    logs.value = res.logs
  }

  return {
    logs,
    count,
    getAllLogs,
  }
})
