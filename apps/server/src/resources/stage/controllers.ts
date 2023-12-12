import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getStages } from './business.js'
import { type RouteHandler } from 'fastify'
import { type FastifyRequestWithSession } from '@/types/index.js'

// GET
export const getStagesController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const userId = req.session?.user?.id
  const stages = await getStages(userId)

  addReqLogs({
    req,
    description: 'Stages récupérés avec succès',
  })
  sendOk(res, stages)
}
