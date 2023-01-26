import {
  getEnvironmentById,
  environmentInitializing,
  getEnvironmentsByProjectId,
  environmentCreated,
  environmentFailed,
  environmentDeleting,
  deleteEnvironment,
} from '../models/queries/environment-queries.js'
import {
  setPermission,
  getPermissionByUserIdAndEnvironmentId,
} from '../models/queries/permission-queries.js'
import { getProjectById, projectLocked, projectUnlocked } from '../models/queries/project-queries.js'
import { getRoleByUserIdAndProjectId } from '../models/queries/users-projects-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'

// GET
export const getEnvironmentByIdController = async (req, res) => {
  const environmentId = req.params?.environmentId
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  try {
    // TODO : idée refacto : get env and includes permissions
    const env = await getEnvironmentById(environmentId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    const userPermissionLevel = await getPermissionByUserIdAndEnvironmentId(userId, environmentId)

    if (!role) throw new Error('Requestor is not member of env\'s project')
    if (role !== 'owner' && !userPermissionLevel) throw new Error('Requestor is not owner and has no rights on this environment')

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
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')
    // TODO : qst @tobi - faut-il être owner du projet pour créer un envrionnement ?
    if (role !== 'owner') throw new Error('Requestor is not owner of project')

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
    // TODO : #133 : appel ansible + création groupe keycloak + ajout owner au groupe keycloak
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

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')
    if (role !== 'owner') throw new Error('Requestor is not owner of env\'s project')

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
    // TODO : #133 : appel ansible + suppression groupe keycloak (+ retirer users du groupe keycloak ?)
    try {
      await deleteEnvironment(environmentId)
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
