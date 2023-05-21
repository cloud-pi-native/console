import { addReqLogs } from '../../utils/logger.js'
import { getAllProjects } from '../../models/queries/project-queries.js'
import { sendOk, sendNotFound } from '../../utils/response.js'
import { adminGroupPath } from 'shared/src/utils/const.js'

export const getAllProjectsController = async (req, res) => {
  try {
    if (!req.session.user.groups?.includes(adminGroupPath)) throw new Error('Vous n\'avez pas les droits administrateur')
    const projects = await getAllProjects()
    addReqLogs({
      req,
      description: 'Ensemble des projets récupérés avec succès',
    })
    return sendOk(res, projects)
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
