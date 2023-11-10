import { addReqLogs } from '@/utils/logger.js'
import { getAllCleanedClusters } from './business.js'
import { sendOk } from '@/utils/response.js'

// GET
export const getClustersController = async (req, res) => {
  const user = req.session?.user
  const cleanedClusters = await getAllCleanedClusters(user)

  addReqLogs({
    req,
    description: 'Clusters récupérés avec succès',
  })
  sendOk(res, cleanedClusters)
}
