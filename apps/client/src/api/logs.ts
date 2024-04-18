import type { GetLogsQuery } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const getAllLogs = async ({ offset, limit }: GetLogsQuery) => {
  const response = await apiClient.LogsAdmin.getLogs({ query: { offset, limit } })
  if (response.status === 200) return response.body
}
