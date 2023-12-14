import { type FastifyInstance } from 'fastify'
import {
  getQuotasController,
} from '../resources/quota/controllers.js'
import { getQuotasSchema } from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les quotas disponibles
  app.get('/',
    {
      schema: getQuotasSchema,
    },
    getQuotasController)
}

export default router
