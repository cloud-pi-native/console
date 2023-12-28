import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import {
  getActiveOrganizations,
} from './business.js'
import type { FastifyInstance } from 'fastify'

import { getActiveOrganizationsSchema } from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  app.get('/',
    {
      schema: getActiveOrganizationsSchema,
    },
    async (req, res) => {
      const requestor = req.session.user
      delete requestor.groups

      const organizations = await getActiveOrganizations(requestor)
      addReqLogs({
        req,
        description: 'Organisations récupérées avec succès',
      })
      sendOk(res, organizations)
    })
}

export default router
