import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GetLogsQuery, Log } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'

export const useLogStore = defineStore('log', () => {
  const logs = ref<Log[]>([])
  const count = ref<number | undefined>(undefined)
  const needRefresh = ref(false)

  const getAllLogs = async ({ offset, limit }: GetLogsQuery = { offset: 0, limit: 100 }) => {
    const res = await apiClient.Logs.getLogs({ query: { offset, limit, clean: false } })
      .then((response: any) => extractData(response, 200))
    count.value = res.total
    logs.value = res.logs as Log[]
  }

  const listLogs = async ({ offset, limit, clean, projectId }: GetLogsQuery = { offset: 0, limit: 10 }) => {
    return apiClient.Logs.getLogs({ query: { offset, limit, clean, projectId } })
      .then((response: any) => extractData(response, 200))
  }

  return {
    logs,
    count,
    needRefresh,
    getAllLogs,
    listLogs,
  }
})
