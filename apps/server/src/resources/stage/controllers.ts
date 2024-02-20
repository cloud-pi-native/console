import type { FastifyInstance } from 'fastify'
import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getStages } from './business.js'

import { getStagesSchema } from '@cpn-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les types d'environnement disponibles
  app.get('/',
    {
      schema: getStagesSchema,
    },
    async (req, res) => {
      const userId = req.session.user.id
      const stages = await getStages(userId)

      addReqLogs({
        req,
        description: 'Stages récupérés avec succès',
      })
      sendOk(res, stages)
    })
}

export default router
