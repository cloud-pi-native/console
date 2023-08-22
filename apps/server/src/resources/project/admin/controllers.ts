import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getAllProjectsBusiness } from './business.js'

export const getAllProjectsController = async (req, res) => {
  const allProjects = await getAllProjectsBusiness()

  addReqLogs({
    req,
    description: 'Ensemble des projets récupérés avec succès',
  })
  return sendOk(res, allProjects)
}
