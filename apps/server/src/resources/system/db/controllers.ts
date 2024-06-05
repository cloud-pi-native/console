import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import type { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify'
import { getDb } from './business.js'

// TODO revoir
const router = async (app: FastifyInstance, _opt: any) => {
  app.get('/', async (req: FastifyRequest, res: FastifyReply) => {
    const db = await getDb()
    addReqLogs({
      req,
      message: 'Export de la BDD avec succès',
    })
    sendOk(res, db)
  })
}

export default router
