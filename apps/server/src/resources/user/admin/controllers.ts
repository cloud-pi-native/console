import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import { getUsers } from './business.js'
import { type RouteHandler } from 'fastify'
import { type FastifyRequestWithSession } from '@/types/index.js'

export const getUsersController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const users = await getUsers()

  addReqLogs({
    req,
    description: 'Ensemble des utilisateurs récupérés avec succès',
  })
  sendOk(res, users)
}
