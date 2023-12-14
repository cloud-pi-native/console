import { addReqLogs } from '@/utils/logger.js'
import { getAllCleanedClusters } from './business.js'
import { sendOk } from '@/utils/response.js'
import { type RouteHandler } from 'fastify'
import { type FastifyRequestWithSession } from '@/types/index.js'

// GET
export const getClustersController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const user = req.session?.user
  const cleanedClusters = await getAllCleanedClusters(user)

  addReqLogs({
    req,
    description: 'Clusters récupérés avec succès',
  })
  sendOk(res, cleanedClusters)
}
