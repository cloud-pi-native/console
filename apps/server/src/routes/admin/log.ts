import {
  getAllLogsController,
} from '@/resources/log/admin/controllers.js'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer des logs
  app.get('/', getAllLogsController)
}

export default router
