import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import type { AdminLogsQuery } from '@cpn-console/shared'
import type { FastifyRequest, FastifyInstance } from 'fastify'
import { getAllLogs } from './business.js'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer des logs
  app.get('/', async (req: FastifyRequest<{
  Querystring: AdminLogsQuery
}>, res) => {
    const { offset, limit } = req.query
    const [total, logs] = await getAllLogs(offset, limit)

    addReqLogs({
      req,
      description: 'Logs récupérés avec succès',
    })
    sendOk(res, { total, logs })
  })
}

export default router
