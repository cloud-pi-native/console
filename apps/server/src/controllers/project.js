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
import { ansibleHost, ansiblePort } from '../utils/env.js'

export const createProjectController = async (req, res) => {
  const data = req.body
  data.id = nanoid()
  data.services = allServices
  data.owner = req.session.user

  let project
  try {
    project = await createProject(data)

    req.log.info({
      ...getLogInfos({ projectId: project.id }),
      description: 'Project successfully created in database',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot create project',
      error,
    })
    return send500(res, error.message)
  }

  try {
    const ansibleData = {
      orgName: project.orgName,
      ownerEmail: project.owner.email,
      projectName: project.projectName,
      envList: project.envList,
    }

    await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/projects`, {
      method: 'POST',
      body: JSON.stringify(ansibleData),
      headers: {
        'content-type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
    })

    send201(res, project)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    send500(res, error)
  }
}

export const addRepoController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.id
  const data = req.body
  data.isInfra = data.isInfra || false

  let dbProject
  try {
    dbProject = await getUserProjectById(projectId, userId)
    if (!dbProject) {
      const message = 'Missing permissions on this project'
      req.log.error({
        ...getLogInfos(),
        description: message,
      })
      return send500(res, message)
    }

    await addRepo(dbProject, data)

    const message = 'Git repository successfully added into project'
    req.log.info({
      ...getLogInfos({ projectId: dbProject.id }),
      description: message,
    })
  } catch (error) {
    const message = 'Cannot add git repository into project'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })
    return send500(res, message)
  }

  try {
    const ansibleData = {
      orgName: dbProject.orgName,
      ownerEmail: dbProject.owner.email,
      projectName: dbProject.projectName,
      internalRepoName: data.internalRepoName,
      externalRepoUrl: data.externalRepoUrl.startsWith('http') ? data.externalRepoUrl.split('://')[1] : data.externalRepoUrl,
      isInfra: data.isInfra,
    }
    if (data.isPrivate) {
      ansibleData.externalUserName = data.externalUserName
      ansibleData.externalToken = data.externalToken
    }

    await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/repos`, {
      method: 'POST',
      body: JSON.stringify(ansibleData),
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
      },
    })

    send201(res, 'Git repository successfully added into project')
  } catch (error) {
    const message = 'Provisioning project with ansible failed'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })
    send500(res, message)
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
    req.log.info({
      ...getLogInfos({ projectId: dbProject.id }),
      description: message,
    })
    send201(res, message)
  } catch (error) {
    const message = 'Cannot add user into project'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })
    send500(res, message)
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

    const message = 'User successfully removed from project'
    req.log.info({
      ...getLogInfos({ projectId: dbProject.id }),
      description: message,
    })
    send200(res, message)
  } catch (error) {
    const message = 'Cannot remove user from project'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })
    send500(res, message)
  }
}

export const getUserProjectsController = async (req, res) => {
  const userId = req.session?.user?.id

  try {
    const projects = await getUserProjects(userId)

    req.log.info({
      ...getLogInfos(),
      description: 'Projects successfully retreived',
    })
    await send200(res, projects)
  } catch (error) {
    const message = 'Cannot retrieve projects'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })
    send500(res, message)
  }
}

export const getUserProjectByIdController = async (req, res) => {
  const userId = req.session?.user?.id
  const id = req.params?.id

  try {
    const project = await getUserProjectById(id, userId)

    req.log.info({
      ...getLogInfos({ projectId: project.id }),
      description: 'Project successfully retrived',
    })
    send200(res, project)
  } catch (error) {
    const message = 'Cannot retrieve project'
    req.log.error({
      ...getLogInfos({ projectId: id }),
      description: message,
      error,
    })
    send500(res, message)
  }
}
