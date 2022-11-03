import { nanoid } from 'nanoid'
import { allServices } from 'shared/src/schemas/project.js'
import { getLogInfos } from '../utils/logger.js'
import {
  createProject,
  updateProject,
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
      error: error.message,
    })
    send500(res, error.message)
  }
}

export const updateProjectController = async (req, res) => {
  const id = req.params.id
  const data = req.body

  try {
    const userId = req.session.user.id
    const dbProject = await getUserProjectById(id, userId)
    if (!dbProject) {
      throw new Error('Missing permissions on this project')
    }

    await updateProject(data)

    app.log.info({
      ...getLogInfos({ projectId: data.id }),
      description: 'Project successfully updated',
    })
    send200(res, { data: `Project ${data.id} updated` })
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Cannot update project',
      error: error.message,
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
    await send200(res, projects)
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Cannot retrieve projects',
      error: error.message,
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
      error: error.message,
    })
    send500(res, error.message)
  }
}
