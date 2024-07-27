import { addReqLogs } from '@/utils/logger.js'
import { getLogs } from './business.js'
import { serverInstance } from '@/app.js'
import { Log, logContract } from '@cpn-console/shared'
import { Log as LogModel } from '@prisma/client'
import { assertIsAdmin } from '@/utils/controller.js'

export const logRouter = () => serverInstance.router(logContract, {
  // Récupérer des logs
  getLogs: async ({ request: req, query }) => {
    assertIsAdmin(req.session.user)
    try {
      const [total, logs] = await getLogs(query) as [number, unknown[]] as [number, Array<LogModel & { data: Log['data'] }>]
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
