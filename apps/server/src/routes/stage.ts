import { type FastifyInstance } from 'fastify'
import {
  getStagesController,
} from '../resources/stage/controllers.js'
import { getStagesSchema } from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les types d'environnement disponibles
  app.get('/',
    {
      schema: getStagesSchema,
    },
    getStagesController)
}

export default router
