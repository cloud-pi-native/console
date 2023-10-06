import { addReqLogs } from '@/utils/logger.js'
import { sendOk } from '@/utils/response.js'
import { getAllProjects } from './business.js'

export const getAllProjectsController = async (req, res) => {
  const allProjects = await getAllProjects()

  addReqLogs({
    req,
    description: 'Ensemble des projets récupérés avec succès',
  })
  return sendOk(res, allProjects)
}
