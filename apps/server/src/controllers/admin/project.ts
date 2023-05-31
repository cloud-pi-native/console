import { addReqLogs } from '../../utils/logger.js'
import { getAllProjects } from '../../queries/project-queries.js'
import { DsoProject } from '../../utils/services.js'
import { sendOk, sendNotFound } from '../../utils/response.js'

export const getAllProjectsController = async (req, res) => {
  try {
    const allProjects = await getAllProjects() as DsoProject[]

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
