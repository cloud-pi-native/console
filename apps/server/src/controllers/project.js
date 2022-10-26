import { nanoid } from 'nanoid'
import { allServices } from 'shared/src/projects/utils.js'
import { getLogInfos } from '../utils/logger.js'
import {
  createProject,
  getProjects,
  getProjectById,
} from '../models/project-queries.js'
import { send200, send201, send500 } from '../utils/response.js'
import app from '../app.js'

export const createProjectController = async (req, res) => {
  const data = req.body
  data.id = nanoid()
  data.services = allServices

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

export const getProjectsController = async (req, res) => {
  const headers = req.headers
  const session = req.session
  const user = req.session?.user
  const cookies = req.cookies
  console.log('/user', { headers, session, user, cookies })
  try {
    const projects = await getProjects()

    const headers = req.headers
    const cookies = req.cookies
    const session = req.session

    console.log('req: ', app.jwt.verify(req.headers.authorization.split(' ')[1]))

    console.log({ headers, cookies, session })

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
