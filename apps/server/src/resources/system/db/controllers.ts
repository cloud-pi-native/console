import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import type { EnhancedFastifyRequest } from '@/types/index.js'
import type { FastifyReply } from 'fastify'
import { getDb } from './business.js'

// TODO revoir
export const getDbController = async (req: EnhancedFastifyRequest<void>, res: FastifyReply) => {
  const db = await getDb()
  addReqLogs({
    req,
    description: 'Export de la BDD avec succès',
  })
  sendOk(res, db)
}
