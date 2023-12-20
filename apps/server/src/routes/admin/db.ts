import { getDbController } from '@/resources/system/db/controllers.js'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  app.get('/', getDbController)
}

export default router
