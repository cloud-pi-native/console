import {
  getUserProjects,
  projectInitializing,
  projectCreated,
  projectFailed,
  getProjectById,
  projectLocked,
  projectUnlocked,
  projectAddUser,
  projectRemoveUser,
  projectArchiving,
} from '../models/queries/project-queries.js'
import { getUserByEmail, getUserById } from '../models/queries/user-queries.js'
import { deletePermission, getUserPermissions } from '../models/queries/permission-queries.js'
import { getEnvironmentById } from '../models/queries/environment-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'
import { ansibleHost, ansiblePort } from '../utils/env.js'
import { projectSchema } from 'shared/src/schemas/project.js'
import { replaceNestedKeys, lowercaseFirstLetter } from '../utils/queries-tools.js'

// GET
export const getUserProjectsController = async (req, res) => {
  const userId = req.session?.user?.id

  try {
    const projects = await getUserProjects(userId)
    req.log.info({
      ...getLogInfos(),
      description: 'Projects successfully retreived',
    })
    projects.map(project => replaceNestedKeys(project, lowercaseFirstLetter))
    await send200(res, projects)
  } catch (error) {
    const message = 'Cannot retrieve projects'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

export const getProjectByIdController = async (req, res) => {
  const projectId = req.params?.id
  const userId = req.session?.user?.id

  try {
    const project = await getProjectById(projectId)
    if (!project.usersId.includes(userId) && project.ownerId !== userId) throw new Error('Requestor is not member of the project')

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project successfully retrived',
    })
    send200(res, project)
  } catch (error) {
    const message = 'Cannot retrieve project'
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// POST
export const createProjectController = async (req, res) => {
  const data = req.body
  data.ownerId = req.session.user.id

  let project

  try {
    await projectSchema.validateAsync(project)
    project = await projectInitializing(data)
    req.log.info({
      ...getLogInfos({
        projectId: project.id,
      }),
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
    const owner = await getUserById(project.ownerId)
    const ansibleData = {
      orgName: project.organization,
      ownerEmail: owner.email,
      projectName: project.name,
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
      project = await projectCreated(project.id)

      req.log.info({
        ...getLogInfos({ projectId: project.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status to created',
        error: error.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      project = await projectFailed(project.id)

      req.log.info({
        ...getLogInfos({ projectId: project.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status to failed',
        error: error.message,
      })
    }
  }
}

// PUT
export const projectAddUserController = async (req, res) => {
  const userId = req.session?.user.id
  const projectId = req.params?.id
  const data = req.body

  let project
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Project not found')

    if (!project.usersId.includes(userId) && project.ownerId !== userId) throw new Error('Requestor is not member of the project')

    const userToAdd = await getUserByEmail(data.email)
    await projectLocked(projectId)
    await projectAddUser({ projectId, userId: userToAdd.id })

    const message = 'User successfully added into project'
    req.log.info({
      ...getLogInfos({ projectId }),
      description: message,
    })
    send201(res, message)
  } catch (error) {
    const message = 'Cannot add user into project'
    req.log.error({
      ...getLogInfos(),
      error: error.message,
    })
    return send500(res, message)
  }

  try {
    // TODO : US #132 appel ansible
    try {
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error.message,
      })
    }
  }
}

// DELETE
export const projectRemoveUserController = async (req, res) => {
  const userId = req.session?.user.id
  const projectId = req.params?.id
  const data = req.body

  let project
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Project not found')

    if (!project.usersId.includes(userId) && project.ownerId !== userId) throw new Error('Requestor is not member of the project')

    const userToRemove = await getUserByEmail(data.email)
    await projectLocked(projectId)
    await projectRemoveUser({ projectId, userId: userToRemove.id })
    const userPermissionsToDelete = await getUserPermissions(userToRemove.id)
    // TODO : cascading
    for (const userPermission of userPermissionsToDelete) {
      const envId = userPermission.environmentId
      await getEnvironmentById(envId)
      if (envId.projectId === projectId) {
        await deletePermission(userPermission.id)
      }
    }

    const message = 'User successfully removed from project'
    req.log.info({
      ...getLogInfos({ projectId }),
      description: message,
    })
    send200(res, message)
  } catch (error) {
    const message = 'Cannot remove user from project'
    req.log.error({
      ...getLogInfos(),
      error: error.message,
    })
    return send500(res, message)
  }

  try {
    // TODO : US #132 appel ansible
    try {
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error.message,
      })
    }
  }
}

export const projectArchivingController = async (req, res) => {
  const userId = req.session?.user.id
  const projectId = req.params?.id

  try {
    const project = await getProjectById(projectId)
    if (project.ownerId !== userId) throw new Error('Requestor is not owner of the project')

    await projectLocked(projectId)
    await projectArchiving(projectId)
    req.log.info({
      ...getLogInfos({
        projectId,
      }),
      description: 'Project successfully archived in database',
    })
    send200(res, projectId)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot archive project',
      error: error.message,
    })
    return send500(res, error.message)
  }

  try {
    // TODO : US #130 appel ansible
    try {
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project archived and unlocked',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot unlock project',
        error: error.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      await projectFailed(projectId)
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error.message,
      })
    }
    send500(res, error)
  }
}
