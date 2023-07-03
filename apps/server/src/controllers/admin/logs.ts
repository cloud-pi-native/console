import { getAllLogs } from '../../queries/log-queries.js'
import { sendNotFound, sendOk } from '../../utils/response.js'
import { addReqLogs } from '../../utils/logger.js'
import type { EnhancedFastifyRequest } from '@/types/index.js'
import type { AdminLogsGet } from 'shared'
import type { FastifyReply } from 'fastify'

export const getAllLogsController = async (req: EnhancedFastifyRequest<AdminLogsGet>, res: FastifyReply) => {
  const { offset, limit } = req.query
  try {
    const [total, logs] = await getAllLogs({ offset, limit })

    addReqLogs({
      req,
      description: 'Logs récupérés avec succès',
    })
    // TODO
    // req.headers['x-total-count'] = total.toString()
    // sendOk(res, logs)
    sendOk(res, { total, logs })
  } catch (error) {
    const description = 'Echec de la récupération des logs'
    sendNotFound(res, description)
  }
}
