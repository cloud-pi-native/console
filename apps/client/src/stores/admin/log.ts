import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import api from '@/api/index.js'
import type { AdminLogsGet, LogModel } from '@dso-console/shared'

export const useAdminLogStore = defineStore('admin-log', () => {
  const logs: Ref<Array<LogModel | undefined>> = ref([])
  const count: Ref<number | undefined> = ref(undefined)

  const getAllLogs = async ({ offset, limit }: AdminLogsGet['query'] = { offset: 0, limit: 100 }) => {
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
