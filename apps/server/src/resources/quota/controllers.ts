import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getQuotas } from './business.js'
import type { FastifyInstance } from 'fastify'

import { getQuotasSchema } from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les quotas disponibles
  app.get('/',
    {
      schema: getQuotasSchema,
    },
    async (req, res) => {
      const user = req.session.user
      const quotas = await getQuotas(user)

      addReqLogs({
        req,
        description: 'Quotas récupérés avec succès',
      })
      sendOk(res, quotas)
    })
}

export default router
