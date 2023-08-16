import { addReqLogs } from '@/utils/logger.js'
import { getAllProjects } from '@/resources/project/queries.js'
import { sendOk, sendNotFound } from '@/utils/response.js'

export const getAllProjectsController = async (req, res) => {
  try {
    const allProjects = await getAllProjects()

    addReqLogs({
      req,
      description: 'Ensemble des projets récupérés avec succès',
    })
    return sendOk(res, allProjects)
  } catch (error) {
    const description = 'Echec de la récupération de l\'ensemble des projets'
    addReqLogs({
      req,
      description,
      error,
    })
    sendNotFound(res, description)
  }
}