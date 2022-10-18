import { getLogInfos } from '../utils/logger.js'
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

    res.log.info({
      ...getLogInfos({ projectId: project.id }),
      description: 'Project successfully created',
    })
    send201(res, project)
  } catch (error) {
    res.log.error({
      ...getLogInfos(),
      description: 'Cannot create project',
      error,
    })
    send500(res, error.message)
  }
}

export const getProjectsController = async (_req, res) => {
  try {
    const projects = await getProjects()

    res.log.info({
      ...getLogInfos(),
      description: 'Projects successfully retrived',
    })
    send200(res, projects)
  } catch (error) {
    res.log.error({
      ...getLogInfos(),
      description: 'Cannot retrieve projects',
      error,
    })
    send500(res, error.message)
  }
}

export const getProjectByIdController = async (req, res) => {
  const id = req.params.id

  try {
    const project = await getProjectById(id)

    res.log.info({
      ...getLogInfos({ projectId: project.id }),
      description: 'Project successfully retrived',
    })
    send200(res, project)
  } catch (error) {
    res.log.error({
      ...getLogInfos({ projectId: id }),
      description: 'Cannot retrieve project',
      error,
    })
    send500(res, error.message)
  }
}
