import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import type { EnhancedFastifyRequest } from '@/types/index.js'
import type { FastifyReply } from 'fastify'
import { getDbBusiness } from './business.js'

// TODO revoir
export const getDb = async (req: EnhancedFastifyRequest<void>, res: FastifyReply) => {
  const db = await getDbBusiness()
  addReqLogs({
    req,
    description: 'Export de la BDD avec succès',
  })
  sendOk(res, db)
}
