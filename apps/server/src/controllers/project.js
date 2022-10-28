import { nanoid } from 'nanoid'
import { allServices } from 'shared/src/projects/utils.js'
import { getLogInfos } from '../utils/logger.js'
import {
  createProject,
  getUserProjects,
  getUserProjectById,
} from '../models/project-queries.js'
import { send200, send201, send500 } from '../utils/response.js'
import app from '../app.js'

export const createProjectController = async (req, res) => {
  const data = req.body
  data.id = nanoid()
  data.services = allServices
  data.owner = req.session.user

  try {
    const project = await createProject(data)

    app.log.info({
      ...getLogInfos({ projectId: project.id }),
      description: 'Project successfully created',
    })
    send201(res, project)
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Cannot create project',
      error,
    })
    send500(res, error.message)
  }
}

export const getUserProjectsController = async (req, res) => {
  try {
    const userId = req.session.user.id

    const projects = await getUserProjects(userId)

    app.log.info({
      ...getLogInfos(),
      description: 'Projects successfully retrived',
    })
    send200(res, projects)
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Cannot retrieve projects',
      error,
    })
    send500(res, error.message)
  }
}

export const getUserProjectByIdController = async (req, res) => {
  const id = req.params.id

  try {
    const userId = req.session.user.id

    const project = await getUserProjectById(id, userId)

    app.log.info({
      ...getLogInfos({ projectId: project.id }),
      description: 'Project successfully retrived',
    })
    send200(res, project)
  } catch (error) {
    app.log.error({
      ...getLogInfos({ projectId: id }),
      description: 'Cannot retrieve project',
      error,
    })
    send500(res, error.message)
  }
}
