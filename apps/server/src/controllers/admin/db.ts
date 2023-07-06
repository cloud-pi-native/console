import { dumpDb } from '../../queries/index.js'
import { sendNotFound, sendOk } from '../../utils/response.js'
import { addReqLogs } from '../../utils/logger.js'
import type { EnhancedFastifyRequest } from '@/types/index.js'
import type { AdminLogsGet } from 'shared'
import type { FastifyReply } from 'fastify'

// TODO revoir
export const getDb = async (req: EnhancedFastifyRequest<AdminLogsGet>, res: FastifyReply) => {
  try {
    const db = await dumpDb()
    addReqLogs({
      req,
      description: 'Export de la BDD avec succès',
    })
    sendOk(res, db)
  } catch (error) {
    const description = 'Echec de l\'export de la BDD'
    sendNotFound(res, description)
  }
}
