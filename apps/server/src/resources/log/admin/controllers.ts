import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import type { FastifyRequestWithSession } from '@/types/index.js'
import type { AdminLogsQuery } from '@dso-console/shared'
import type { RouteHandler } from 'fastify'
import { getAllLogs } from './business.js'

export const getAllLogsController: RouteHandler = async (req: FastifyRequestWithSession<{
  Querystring: AdminLogsQuery
}>, res) => {
  const { offset, limit } = req.query
  const [total, logs] = await getAllLogs(offset, limit)

  addReqLogs({
    req,
    description: 'Logs récupérés avec succès',
  })
  sendOk(res, { total, logs })
}
