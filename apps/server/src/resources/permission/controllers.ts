import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { Action, checkProjectRole, deletePermissionBusiness, getEnvironmentPermissionsBusiness, preventUpdatingOwnerPermission, setPermissionBusiness, updatePermissionBusiness } from './business.js'
import { checkGetEnvironment, getEnvironmentInfos } from '@/resources/environment/business.js'

// GET
export const getEnvironmentPermissionsController = async (req, res) => {
  const userId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId

  await checkProjectRole(projectId, userId)

  const permissions = await getEnvironmentPermissionsBusiness(environmentId)

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
  const userId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.body

  await checkProjectRole(projectId, userId)

  const permission = await setPermissionBusiness(data.userId, environmentId, data.level)

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
  const userId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.body

  const env = await getEnvironmentInfos(environmentId)

  await checkGetEnvironment(env, userId)

  await preventUpdatingOwnerPermission(projectId, data.userId)

  const permission = await updatePermissionBusiness(data.userId, environmentId, parseInt(data.level))

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

  const env = await getEnvironmentInfos(environmentId)

  await checkGetEnvironment(env, requestorId)

  await preventUpdatingOwnerPermission(projectId, userId, Action.delete)

  const permission = await deletePermissionBusiness(userId, environmentId)

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
