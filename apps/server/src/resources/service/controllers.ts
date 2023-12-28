import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { checkServicesHealth } from './business.js'
import type { FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  app.get('/', async (req, res) => {
    const requestor = req.session.user
    delete requestor.groups

    const serviceData = await checkServicesHealth(requestor)
    addReqLogs({
      req,
      description: 'Etats des services récupérés avec succès',
    })
    sendOk(res, serviceData)
  })
}

export default router
