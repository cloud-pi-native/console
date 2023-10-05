import { getAllLogs as getAllLogsQuery } from '@/resources/queries-index.js'
import { AdminLogsGet } from '@dso-console/shared'

export const getAllLogs = async (offset: AdminLogsGet['query']['offset'], limit: AdminLogsGet['query']['limit']) => {
  return await getAllLogsQuery({ offset, limit })
}
