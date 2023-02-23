import {
  getEnvironmentPermissions,
  setPermission,
  updatePermission,
  deletePermission,
  getPermissionByUserIdAndEnvironmentId,
} from '../models/queries/permission-queries.js'
import {
  getRoleByUserIdAndProjectId,
  getSingleOwnerByProjectId,
} from '../models/queries/users-projects-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'

// GET

export const getEnvironmentPermissionsController = async (req, res) => {
  const userId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const permissions = await getEnvironmentPermissions(environmentId)
    req.log.info({
      ...getLogInfos(),
      description: 'Permissions successfully retreived',
    })
    return send200(res, permissions)
  } catch (error) {
    const message = `Cannot retrieve permissions: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// POST

export const setPermissionController = async (req, res) => {
  const userId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.body

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const permission = await setPermission({ userId: data.userId, environmentId, level: data.level })
    req.log.info({
      ...getLogInfos(),
      description: 'Permission successfully created',
    })
    return send201(res, permission)
  } catch (error) {
    const message = `Cannot create permissions: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// PUT

export const updatePermissionController = async (req, res) => {
  const userId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.body

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const requestorPermission = await getPermissionByUserIdAndEnvironmentId(userId, environmentId)
    if (!requestorPermission) throw new Error('Le requérant doit avoir des droits sur l\'environnement pour modifier des permissions')

    const ownerId = await getSingleOwnerByProjectId(projectId)
    if (data.userId === ownerId) throw new Error('La permission du owner du projet ne peut être modifiée')

    const permission = await updatePermission({ userId: data.userId, environmentId, level: data.level })
    req.log.info({
      ...getLogInfos(),
      description: 'Permission successfully updated',
    })
    return send200(res, permission)
  } catch (error) {
    const message = `Cannot update permissions : ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// DELETE

export const deletePermissionController = async (req, res) => {
  const requestorId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const userId = req.params?.userId

  try {
    const role = await getRoleByUserIdAndProjectId(requestorId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const requestorPermission = await getPermissionByUserIdAndEnvironmentId(requestorId, environmentId)
    if (!requestorPermission) throw new Error('Le requérant doit avoir des droits sur l\'environnement pour supprimer des permissions')

    const ownerId = await getSingleOwnerByProjectId(projectId)
    if (userId === ownerId) throw new Error('La permission du owner du projet ne peut être supprimée')

    const permission = await deletePermission(userId, environmentId)

    const message = 'Permission successfully deleted in database'
    req.log.info({
      ...getLogInfos({ permission }),
      description: message,
    })
    return send200(res, permission)
  } catch (error) {
    const message = `Cannot delete permissions : ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot delete permission',
      error: error.message,
    })
    send500(res, message)
  }
}
