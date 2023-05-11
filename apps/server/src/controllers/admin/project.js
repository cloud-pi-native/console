import { getAllProjects } from '../models/queries/project-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { sendOk, sendNotFound } from '../utils/response.js'
import { adminGroupPath } from 'shared/src/utils/const.js'

export const getAllProjectsController = async (req, res) => {
  try {
    if (!req.session.user.groups?.includes(adminGroupPath)) throw new Error('Vous n\'avez pas les droits administrateurs')
    const projects = await getAllProjects()
    req.log.info({
      ...getLogInfos(),
      description: 'Projects récupérés avec succès',
    })
    return sendOk(res, projects)
  } catch (error) {
    const message = 'Projets non trouvés'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    sendNotFound(res, message)
  }
}
