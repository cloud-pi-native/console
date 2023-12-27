import { addReqLogs } from '@/utils/logger.js'
import { getAllCleanedClusters } from './business.js'
import { sendOk } from '@/utils/response.js'
import type { FastifyInstance } from 'fastify'

import { getClustersSchema } from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les quotas disponibles
  app.get('/',
    {
      schema: getClustersSchema,
    },
    async (req, res) => {
      const user = req.session.data.user
      const cleanedClusters = await getAllCleanedClusters(user)

      addReqLogs({
        req,
        description: 'Clusters récupérés avec succès',
      })
      sendOk(res, cleanedClusters)
    })
}

export default router
