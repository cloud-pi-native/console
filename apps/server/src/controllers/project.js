import { nanoid } from 'nanoid'
import { allServices } from 'shared/src/schemas/project.js'
import { getLogInfos } from '../utils/logger.js'
import {
  createProject,
  addRepo,
  addUser,
  getUserProjects,
  getUserProjectById,
  removeUser,
} from '../models/project-queries.js'
import { send200, send201, send500 } from '../utils/response.js'
import app from '../app.js'
import { projectProvisioning } from '../utils/ansible.js'

export const createProjectController = async (req, res) => {
  const data = req.body
  data.id = nanoid()
  data.services = allServices
  data.owner = req.session.user

  let project
  try {
    project = await createProject(data)

    app.log.info({
      ...getLogInfos({ projectId: project.id }),
      description: 'Project successfully created in database',
    })
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Cannot create project',
      error: error.message,
    })
    send500(res, error.message)
    return
  }

  try {
    await projectProvisioning()

    send201(res, project)
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Cannot provisionne project in services',
      error: error.message,
    })
    send500(res, error.message)
  }
}

export const addRepoController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.id
  const data = req.body

  try {
    const dbProject = await getUserProjectById(projectId, userId)
    if (!dbProject) {
      throw new Error('Missing permissions on this project')
    }

    await addRepo(dbProject, data)

    const message = 'Git repository successfully added into project'
    app.log.info({
      ...getLogInfos({ projectId: dbProject.id }),
      description: message,
    })
    send201(res, message)
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Cannot add git repository into project',
      error: error.message,
    })
    send500(res, error.message)
  }
}

export const addUserController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.id
  const data = req.body

  try {
    const dbProject = await getUserProjectById(projectId, userId)
    if (!dbProject) {
      throw new Error('Missing permissions on this project')
    }

    await addUser(dbProject, data)

    const message = 'User successfully added into project'
    app.log.info({
      ...getLogInfos({ projectId: dbProject.id }),
      description: message,
    })
    send201(res, message)
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Cannot add user into project',
      error: error.message,
    })
    send500(res, error.message)
  }
}

export const removeUserController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.id
  const data = req.body

  try {
    const dbProject = await getUserProjectById(projectId, userId)
    if (!dbProject) {
      throw new Error('Missing permissions on this project')
    }

    await removeUser(dbProject, data)

    const message = 'User successfully added into project'
    app.log.info({
      ...getLogInfos({ projectId: dbProject.id }),
      description: message,
    })
    send200(res, message)
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Cannot add user into project',
      error: error.message,
    })
    send500(res, error.message)
  }
}

export const getUserProjectsController = async (req, res) => {
  const userId = req.session?.user?.id

  try {
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
  const userId = req.session?.user?.id
  const id = req.params?.id

  try {
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
