import { clusterContract } from '@cpn-console/shared'
import { addReqLogs } from '@/utils/logger.js'
import { getAllUserClusters } from './business.js'
import { serverInstance } from '@/app.js'

export const clusterRouter = () => serverInstance.router(clusterContract, {
  listClusters: async ({ request: req }) => {
    const user = req.session.user
    const cleanedClusters = await getAllUserClusters(user)

    addReqLogs({ req, message: 'Clusters récupérés avec succès' })
    return {
      status: 200,
      body: cleanedClusters,
    }
  },
})
