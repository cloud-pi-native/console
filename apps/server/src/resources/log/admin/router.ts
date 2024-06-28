import { addReqLogs } from '@/utils/logger.js'
import { getAllLogs } from './business.js'
import { serverInstance } from '@/app.js'
import { Log, logAdminContract } from '@cpn-console/shared'
import { Log as LogModel } from '@prisma/client'

export const logAdminRouter = () => serverInstance.router(logAdminContract, {
  // Récupérer des logs
  getLogs: async ({ request: req, query }) => {
    try {
      const { offset, limit } = query
      const [total, logs] = await getAllLogs(offset, limit) as [number, unknown[]] as [number, Array<LogModel & { data: Log['data'] }>]
      addReqLogs({
        req,
        message: 'Logs récupérés avec succès',
      })
      return {
        status: 200,
        body: { total, logs },
      }
    } catch (error) {
      throw new Error(error.message)
    }
  },
})
