import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import {
  getActiveOrganizations,
} from './business.js'
import { FastifyRequestWithSession } from '@/types/index.js'
import { RouteHandler } from 'fastify'

// GET
export const getActiveOrganizationsController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const requestor = req.session?.user
  delete requestor.groups

  const organizations = await getActiveOrganizations(requestor)
  addReqLogs({
    req,
    description: 'Organisations récupérées avec succès',
  })
  sendOk(res, organizations)
}
