import { appLogger, getLogInfos } from '../utils/logger.js'
import {
  createProject,
  getProjects,
  getProjectById,
} from '../models/project-queries.js'
import { send200, send201, send500 } from '../utils/response.js'

export const createProjectController = async (req, res) => {
  const data = req.body

  try {
    const project = await createProject(data)

    appLogger.info({
      ...getLogInfos({ projectId: project._id }),
      description: 'Project successfully created',
    })
    send201(res, { project })
  } catch (error) {
    appLogger.error({
      ...getLogInfos(),
      description: 'Cannot create project',
      error,
    })
    send500(res, error.message)
  }
}

export const getProjectsController = async (req, res) => {
  console.log('controller : getProjects')
  try {
    const projects = await getProjects()

    appLogger.info({
      ...getLogInfos(),
      description: 'Projects successfully retrived',
    })
    send200(res, { projects })
  } catch (error) {
    appLogger.error({
      ...getLogInfos(),
      description: 'Cannot retrieve projects',
      error,
    })
    send500(res, error.message)
  }
}

export const getProjectController = async (req, res) => {
  const id = req.params.id

  try {
    const project = await getProjectById(id)

    appLogger.info({
      ...getLogInfos({ projectId: project._id }),
      description: 'Project successfully retrived',
    })
    send200(res, { project })
  } catch (error) {
    appLogger.error({
      ...getLogInfos({ projectId: id }),
      description: 'Cannot retrieve project',
      error,
    })
    send500(res, error.message)
  }
}