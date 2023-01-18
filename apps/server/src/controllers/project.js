import { nanoid } from 'nanoid'
import { allServices } from 'shared/src/utils/iterables.js'
import { getLogInfos } from '../utils/logger.js'
import {
  createProject,
  updateProjectStatus,
  addRepo,
  addUser,
  getUserProjectById,
  removeUser,
} from '../models/project-queries.js'
import {
  getUserProjects,
} from '../models/project-queries2.js'
import { send200, send201, send500 } from '../utils/response.js'
import { ansibleHost, ansiblePort } from '../utils/env.js'

export const createProjectController = async (req, res) => {
  const data = req.body
  data.id = nanoid()
  data.services = allServices
  data.status = 'initializing'
  data.locked = true
  data.owner = req.session.user
  data.owner.status = 'initializing'
  delete data.owner.groups

  let project
  try {
    project = await createProject(data)

    req.log.info({
      ...getLogInfos({ projectId: project.id }),
      description: 'Project successfully created in database',
    })
    send201(res, project)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot create project',
      error: error.message,
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
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
      body: ansibleData,
    })

    try {
      project.status = 'created'
      project.owner.status = 'created'
      project = await updateProjectStatus(project, 'created')

      req.log.info({
        ...getLogInfos({ projectId: project.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: `Cannot update project status: ${error.message}`,
        error,
      })
      return send500(res, error.message)
    }

    send201(res, project)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      project.status = 'failed'
      project.owner.status = 'failed'
      project = await updateProjectStatus(project, 'failed')

      req.log.info({
        ...getLogInfos({ projectId: project.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: `Cannot update project status: ${error.message}`,
        error,
      })
      return send500(res, error.message)
    }
    send500(res, error)
  }
}

export const addRepoController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.id
  const data = req.body
  data.status = 'initializing'

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

    dbProject.locked = true
    await addRepo(dbProject, data)
    dbProject = await getUserProjectById(projectId, userId)

    const message = 'Git repository successfully added into project'
    req.log.info({
      ...getLogInfos({ projectId: dbProject.id }),
      description: message,
    })
  } catch (error) {
    const message = `Cannot add git repository into project: ${error.message}`
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

    try {
      const indexRepo = dbProject.repos.findIndex(repo => repo.internalRepoName === data.internalRepoName)
      dbProject.repos[indexRepo].status = 'created'

      dbProject = await updateProjectStatus(dbProject, 'created')

      req.log.info({
        ...getLogInfos({ projectId: dbProject.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: `Cannot update project status: ${error.message}`,
        error,
      })
      return send500(res, error.message)
    }

    send201(res, 'Git repository successfully added into project')
  } catch (error) {
    const message = `Provisioning project with ansible failed: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })

    try {
      const indexRepo = dbProject.repos.findIndex(repo => repo.internalRepoName === data.internalRepoName)
      dbProject.repos[indexRepo].status = 'failed'
      dbProject = await updateProjectStatus(dbProject, 'failed')

      req.log.info({
        ...getLogInfos({ projectId: dbProject.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: `Cannot update project status: ${error.message}`,
        error,
      })
      return send500(res, error.message)
    }
    send500(res, message)
  }
}

export const addUserController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.id
  const data = req.body
  data.status = 'initializing'

  let dbProject
  try {
    dbProject = await getUserProjectById(projectId, userId)

    if (!dbProject) {
      throw new Error('Missing permissions on this project')
    }

    await addUser(dbProject, data)
    dbProject = await getUserProjectById(projectId, userId)

    const message = 'User successfully added into project'
    req.log.info({
      ...getLogInfos({ projectId: dbProject.id }),
      description: message,
    })
    send201(res, message)
  } catch (error) {
    const message = `Cannot add user into project: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })
    return send500(res, message)
  }

  try {
    // TODO : US #132 appel ansible
    try {
      const indexUser = dbProject.users.findIndex(user => user.email === data.email)
      dbProject.users[indexUser].status = 'created'
      dbProject = await updateProjectStatus(dbProject, 'created')

      req.log.info({
        ...getLogInfos({ projectId: dbProject.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: `Cannot update project status: ${error.message}`,
        error,
      })
      return send500(res, error.message)
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      const indexUser = dbProject.users.findIndex(user => user.email === data.email)
      dbProject.users[indexUser].status = 'failed'
      dbProject = await updateProjectStatus(dbProject, 'failed')

      req.log.info({
        ...getLogInfos({ projectId: dbProject.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: `Cannot update project status: ${error.message}`,
        error,
      })
      return send500(res, error.message)
    }
    send500(res, error)
  }
}

export const removeUserController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.id
  const data = req.body

  let dbProject
  try {
    dbProject = await getUserProjectById(projectId, userId)
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
    const message = `Cannot remove user from project: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })
    return send500(res, message)
  }
  try {
    // TODO : US #132 appel ansible
    try {
      dbProject = await updateProjectStatus(dbProject, 'created')

      req.log.info({
        ...getLogInfos({ projectId: dbProject.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: `Cannot update project status: ${error.message}`,
        error,
      })
      return send500(res, error.message)
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      dbProject = await updateProjectStatus(dbProject, 'failed')

      req.log.info({
        ...getLogInfos({ projectId: dbProject.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: `Cannot update project status: ${error.message}`,
        error,
      })
      return send500(res, error.message)
    }
    send500(res, error)
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
