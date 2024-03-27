import { addReqLogs } from '@/utils/logger.js'
import { getStages } from './business.js'
import { serverInstance } from '@/app.js'
import { stageContract } from '@cpn-console/shared'

export const stageRouter = () => serverInstance.router(stageContract, {

  // Récupérer les types d'environnement disponibles
  getStages: async ({ request: req }) => {
    const userId = req.session.user.id
    const stages = await getStages(userId)

    addReqLogs({
      req,
      message: 'Stages récupérés avec succès',
    })
    return {
      status: 200,
      body: stages,
    }
  },
})
