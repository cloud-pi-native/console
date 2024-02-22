import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { checkServicesHealth } from './business.js'
import type { FastifyInstance } from 'fastify'
import { getServiceHealthSchema } from '@dso-console/shared'
import type { UserDetails } from '@/types/index.js'

const router = async (app: FastifyInstance, _opt) => {
  app.get('/',
    {
      schema: getServiceHealthSchema,
    }, async (req, res) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { groups, ...rest } = req.session.user
      const requestor: Omit<UserDetails, 'groups'> = { ...rest }

      const serviceData = await checkServicesHealth(requestor)
      addReqLogs({
        req,
        description: 'Etats des services récupérés avec succès',
      })
      sendOk(res, serviceData)
    })
}

export default router
