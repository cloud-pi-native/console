import { getAllLogs as getAllLogsQuery } from '@/resources/queries-index.js'
import { AdminLogsQuery } from '@dso-console/shared'

export const getAllLogs = async (offset: AdminLogsQuery['offset'], limit: AdminLogsQuery['limit']) => {
  return await getAllLogsQuery({ offset, limit })
}
