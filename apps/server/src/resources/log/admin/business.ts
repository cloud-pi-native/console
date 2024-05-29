import { getAllLogs as getAllLogsQuery } from '@/resources/queries-index.js'
import { AdminLogsQuery } from '@cpn-console/shared'

export const getAllLogs = async (offset: AdminLogsQuery['offset'], limit: AdminLogsQuery['limit']) => getAllLogsQuery({ offset, limit })
