import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GetLogsQuery, Log } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useAdminLogStore = defineStore('admin-log', () => {
  const logs = ref<Log[]>([])
  const count = ref<number | undefined>(undefined)

  const getAllLogs = async ({ offset, limit }: GetLogsQuery = { offset: 0, limit: 100 }) => {
    const res = await apiClient.Logs.getLogs({ query: { offset, limit } })
      .then(response => extractData(response, 200))
    count.value = res.total
    logs.value = res.logs
  }

  return {
    logs,
    count,
    getAllLogs,
  }
})
