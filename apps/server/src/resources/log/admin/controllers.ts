import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import type { EnhancedFastifyRequest } from '@/types/index.js'
import type { AdminLogsGet } from '@dso-console/shared'
import type { FastifyReply } from 'fastify'
import { getAllLogsBusiness } from './business.js'

export const getAllLogsController = async (req: EnhancedFastifyRequest<AdminLogsGet>, res: FastifyReply) => {
  const { offset, limit } = req.query
  const [total, logs] = await getAllLogsBusiness(offset, limit)

  addReqLogs({
    req,
    description: 'Logs récupérés avec succès',
  })
  sendOk(res, { total, logs })
}
