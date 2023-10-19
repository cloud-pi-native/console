import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { deletePermission, getEnvironmentPermissions, setPermission, updatePermission } from './business.js'

// GET
export const getEnvironmentPermissionsController = async (req, res) => {
  const userId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId

  const permissions = await getEnvironmentPermissions(userId, projectId, environmentId)

  addReqLogs({
    req,
    description: 'Permissions de l\'environnement récupérées avec succès',
    extras: {
      projectId,
      environmentId,
    },
  })
  sendOk(res, permissions)
}

// POST
export const setPermissionController = async (req, res) => {
  const requestorId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.body

  const permission = await setPermission(projectId, requestorId, data.userId, environmentId, data.level)

  addReqLogs({
    req,
    description: 'Permission créée avec succès',
    extras: {
      permissionId: permission.id,
      projectId,
      environmentId,
    },
  })
  sendCreated(res, permission)
}

// PUT
export const updatePermissionController = async (req, res) => {
  const requestorId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.body

  const permission = await updatePermission(projectId, requestorId, data.userId, environmentId, parseInt(data.level))

  addReqLogs({
    req,
    description: 'Permission mise à jour avec succès',
    extras: {
      permissionId: permission.id,
      projectId,
      environmentId,
    },
  })
  sendOk(res, permission)
}

// DELETE
export const deletePermissionController = async (req, res) => {
  const requestorId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const userId = req.params?.userId

  const permission = await deletePermission(userId, environmentId, requestorId)

  addReqLogs({
    req,
    description: 'Permissions supprimée avec succès',
    extras: {
      projectId,
      environmentId,
    },
  })
  sendOk(res, permission)
}
