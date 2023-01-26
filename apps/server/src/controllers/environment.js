import {
  getEnvironmentById,
  getProjectByEnvironmentId,
  environmentInitializing,
  getEnvironmentsByProjectId,
  environmentCreated,
  environmentFailed,
  environmentDeleting,
  deleteEnvironment,
} from '../models/queries/environment-queries.js'
import { deletePermission, getEnvPermissions, setPermission } from '../models/queries/permission-queries.js'
import { getProjectById, projectLocked, projectUnlocked } from '../models/queries/project-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'

// GET
export const getEnvironmentByIdController = async (req, res) => {
  const environmentId = req.params?.environmentId
  const userId = req.session?.user?.id

  try {
    const env = await getEnvironmentById(environmentId)
    const project = await getProjectByEnvironmentId(environmentId)

    // TODO : utiliser UsersProjects
    if (!project.usersId.includes(userId)) throw new Error('Requestor is not member of env\'s project')
    req.log.info({
      ...getLogInfos({
        envId: env.id,
      }),
      description: 'Environment successfully retrieved',
    })
    send200(res, env)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot retrieve environment',
      error: error.message,
    })
    return send500(res, error.message)
  }
}

// POST
export const environmentInitializingController = async (req, res) => {
  const data = req.body
  const userId = req.session?.user.id
  const projectId = req.params?.projectId

  let env
  try {
    const project = await getProjectById(projectId)
    // TODO : utiliser UsersProjects
    if (!project.usersId.includes(userId)) throw new Error('Requestor is not member of env\'s project')

    const projectEnvs = await getEnvironmentsByProjectId(projectId)
    projectEnvs.forEach(env => {
      if (env.name === data.name) throw new Error('Requested environment already exists for this project')
    })

    env = await environmentInitializing(data)
    await projectLocked(projectId)

    req.log.info({
      ...getLogInfos({
        projectId: project.id,
      }),
      description: 'Environment successfully created in database',
    })
    send201(res, env)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot create environment',
      error: error.message,
    })
    return send500(res, error.message)
  }

  try {
    // TODO : #133 : appel ansible
    try {
      await environmentCreated(env.id)
      await setPermission({
        userId: data.userId,
        envId: env.id,
        level: data.level,
      })
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId: env.id }),
        description: 'Environment status successfully updated to created in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update environment status to created',
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
      await environmentFailed(env.id)
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId: env.id }),
        description: 'Environment status successfully updated to failed in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update environment status to failed',
        error: error.message,
      })
    }
  }
}

// DELETE
export const environmentDeletingController = async (req, res) => {
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const userId = req.session?.user.id

  let project
  try {
    project = await getProjectByEnvironmentId(environmentId)
    // TODO : utiliser UsersProjects
    if (project.ownerId !== userId) throw new Error('Requestor is not owner of env\'s project')

    const env = await environmentDeleting(environmentId)
    await projectLocked(projectId)

    req.log.info({
      ...getLogInfos({
        projectId,
      }),
      description: 'Environment status successfully updated in database',
    })
    send201(res, env)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update environment status',
      error: error.message,
    })
    return send500(res, error.message)
  }

  try {
    // TODO : #133 : appel ansible
    try {
      await deleteEnvironment(environmentId)
      const permissions = await getEnvPermissions(environmentId)
      // TODO : cascading
      for (const permission of permissions) {
        await deletePermission(permission.id)
      }
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ envId: environmentId }),
        description: 'Environment successfully deleted',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot delete environment',
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
      await environmentFailed(environmentId)
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ envId: environmentId }),
        description: 'Environment status successfully updated to failed in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update environment status to failed',
        error: error.message,
      })
    }
  }
}
