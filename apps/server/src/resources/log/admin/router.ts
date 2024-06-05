import { addReqLogs } from '@/utils/logger.js'
import { getAllLogs } from './business.js'
import { serverInstance } from '@/app.js'
import { logAdminContract, type Log } from '@cpn-console/shared'

export const logAdminRouter = () => serverInstance.router(logAdminContract, {
  // Récupérer des logs
  getLogs: async ({ request: req, query }) => {
    const { offset, limit } = query

    // need to force type JSONValue as Log['data']
    const [total, logs] = await getAllLogs(offset, limit) as unknown as [number, Log[]]

    addReqLogs({
      req,
      message: 'Logs récupérés avec succès',
    })
    return {
      status: 200,
      body: { total, logs },
    }
  },
})
