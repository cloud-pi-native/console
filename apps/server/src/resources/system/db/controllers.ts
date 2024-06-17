import { addReqLogs } from '@/utils/logger.js'
import type { FastifyRequest, FastifyInstance } from 'fastify'
import { getDb } from './business.js'
import { FastifyRouteConfig } from 'fastify/types/route.js'

// TODO revoir
const router = async (app: FastifyInstance, _opt: FastifyRouteConfig) => {
  app.get('/', async (req: FastifyRequest) => {
    const db = await getDb()
    addReqLogs({
      req,
      message: 'Export de la BDD avec succès',
    })
    return db
  })
}

export default router
