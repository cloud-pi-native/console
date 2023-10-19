import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getStages } from './business.js'

// GET
export const getStageController = async (req, res) => {
  const userId = req.session?.user?.id
  const stages = await getStages(userId)

  addReqLogs({
    req,
    description: 'Stages récupérés avec succès',
  })
  sendOk(res, stages)
}
