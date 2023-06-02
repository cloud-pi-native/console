import { addReqLogs } from '../../utils/logger.js'
import { getAllProjects } from '../../models/queries/project-queries.js'
import { getSingleOwnerByProjectId } from '../../models/queries/users-projects-queries.js'
import { sendOk, sendNotFound, sendForbidden } from '../../utils/response.js'
import { adminGroupPath } from 'shared/src/utils/const.js'

export const getAllProjectsController = async (req, res) => {
  if (!req.session.user.groups?.includes(adminGroupPath)) sendForbidden(res, 'Vous n\'avez pas les droits administrateur')

  try {
    const allProjects = await getAllProjects()

    const projects = []

    for (const project of allProjects) {
      const owner = await getSingleOwnerByProjectId(project.id)
      projects.push({
        ...project.get({ plain: true }),
        owner,
      })
    }

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
