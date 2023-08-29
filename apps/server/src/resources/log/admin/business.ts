import { getAllLogs } from '@/resources/queries-index.js'
import { AdminLogsGet } from '@dso-console/shared'

export const getAllLogsBusiness = async (offset: AdminLogsGet['query']['offset'], limit: AdminLogsGet['query']['limit']) => {
  return await getAllLogs({ offset, limit })
}
