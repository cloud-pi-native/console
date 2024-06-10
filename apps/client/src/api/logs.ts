import type { GetLogsQuery } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const getAllLogs = ({ offset, limit }: GetLogsQuery) =>
  apiClient.LogsAdmin.getLogs({ query: { offset, limit } })
    .then(response => extractData(response, 200))
