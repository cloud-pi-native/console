import {
  getEnvironmentPermissions,
  setEnvironmentPermission,
  deletePermission,
} from '../models/queries/permission-queries.js'
import { getRoleByUserIdAndProjectId } from '../models/queries/users-projects-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'

// GET

export const getEnvironmentPermissionsController = async (req, res) => {
  const userId = req.session?.userId
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')

    const permissions = await getEnvironmentPermissions(environmentId)
    req.log.info({
      ...getLogInfos(),
      description: 'Permissions successfully retreived',
    })
    await send200(res, permissions)
  } catch (error) {
    const message = 'Cannot retrieve permissions'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// POST

export const setEnvironmentPermissionController = async (req, res) => {
  const userId = req.session?.userId
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.data

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')

    const permission = await setEnvironmentPermission({ userId: data.userId, environmentId, level: data.level })
    req.log.info({
      ...getLogInfos(),
      description: 'Permission successfully created',
    })
    await send201(res, permission)
  } catch (error) {
    const message = `Cannot create permissions ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// PUT

export const envUpdatePermissionController = async (req, res) => {
  const userId = req.session?.userId
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.data

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')

    const permission = await setEnvironmentPermission({ userId: data.userId, environmentId, level: data.level })
    req.log.info({
      ...getLogInfos(),
      description: 'Permission successfully updated',
    })
    await send201(res, permission)
  } catch (error) {
    const message = `Cannot update permissions ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// DELETE

export const envRemovePermissionController = async (req, res) => {
  const userId = req.session?.userId
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.data

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')

    const permission = await deletePermission(data.userId, environmentId)

    req.log.info({
      ...getLogInfos({
        projectId,
      }),
      description: 'Permission status successfully deleted in database',
    })
    send201(res, permission)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot delete permission',
      error: error.message,
    })
  }
}
