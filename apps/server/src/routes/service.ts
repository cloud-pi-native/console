import { checkServicesHealthController } from '@/resources/service/controllers.js'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  app.get('/', checkServicesHealthController)
}

export default router
