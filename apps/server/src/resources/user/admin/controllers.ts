import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import { getUsers } from './business.js'
import type { FastifyInstance } from 'fastify'

import { getUsersSchema } from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer tous les utilisateurs
  app.get('/',
    {
      schema: getUsersSchema,
    },
    async (req, res) => {
      const users = await getUsers()

      addReqLogs({
        req,
        description: 'Ensemble des utilisateurs récupérés avec succès',
      })
      sendOk(res, users)
    })
}

export default router
