import { addReqLogs } from '@/utils/logger.js'
import { getAllLogs } from './business.js'
import { serverInstance } from '@/app.js'
import { logAdminContract } from '@cpn-console/shared'

export const logAdminRouter = () => serverInstance.router(logAdminContract, {
  // Récupérer des logs
  getLogs: async ({ request: req, query }) => {
    try {
      const { offset, limit } = query
      const [total, logs] = await getAllLogs(offset, limit)

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
