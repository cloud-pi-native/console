import { clusterContract } from '@cpn-console/shared'
import { addReqLogs } from '@/utils/logger.js'
import { getAllCleanedClusters } from './business.js'
import { serverInstance } from '@/app.js'

export const clusterRouter = () => serverInstance.router(clusterContract, {
  getClusters: async ({ request: req }) => {
    const user = req.session.user
    const cleanedClusters = await getAllCleanedClusters(user)

    addReqLogs({ req, message: 'Clusters récupérés avec succès' })
    return {
      status: 200,
      body: cleanedClusters,
    }
  },
})
