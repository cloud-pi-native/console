import { type FastifyInstance } from 'fastify'
import {
  getClustersController,
} from '../resources/cluster/controllers.js'
import { getClustersSchema } from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les quotas disponibles
  app.get('/',
    {
      schema: getClustersSchema,
    },
    getClustersController)
}

export default router
