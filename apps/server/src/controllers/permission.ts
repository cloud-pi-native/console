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
import { addReqLogs } from '../utils/logger.js'
import { sendOk, sendCreated, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
// import hooksHandlers from '../plugins/index.js'

// GET
export const getEnvironmentPermissionsController = async (req, res) => {
  const userId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const permissions = await getEnvironmentPermissions(environmentId)

    addReqLogs({
      req,
      description: 'Permissions de l\'environnement récupérées avec succès',
      extras: {
        projectId,
        environmentId,
      },
    })
    sendOk(res, permissions)
  } catch (error) {
    const description = 'Echec de la récupération des permissions de l\'environnement'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        environmentId,
      },
      error,
    })
    sendNotFound(res, description)
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
    // TODO chercher le nom de l'environnement associé et dériver les noms keycloak
    // if (data.level === 0) await removeMembers([data.userId], [permission.Environment.name])
    // if (data.level === 10) await removeMembers([data.userId], [permission.Environment.name]) && await addMembers([data.userId], [permission.Environment.name])
    // if (data.level === 20) await addMembers([data.userId], [permission.Environment.name])
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
  } catch (error) {
    const description = 'Echec de la création d\'une permission'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        environmentId,
      },
      error,
    })
    sendBadRequest(res, description)
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

    const owner = await getSingleOwnerByProjectId(projectId)
    if (data.userId === owner.id) throw new Error('La permission du owner du projet ne peut être modifiée')

    const permission = await updatePermission({ userId: data.userId, environmentId, level: data.level })

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
  } catch (error) {
    const description = 'Echec de la mise à jour de la permission'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        environmentId,
      },
      error,
    })
    sendBadRequest(res, description)
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

    const owner = await getSingleOwnerByProjectId(projectId)
    if (userId === owner.id) throw new Error('La permission du owner du projet ne peut être supprimée')

    const permission = await deletePermission(userId, environmentId)

    addReqLogs({
      req,
      description: 'Permissions supprimée avec succès',
      extras: {
        permissionId: permission.id,
        projectId,
        environmentId,
      },
    })
    sendOk(res, permission)
  } catch (error) {
    const description = 'Echec de la suppression de la permission'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        environmentId,
      },
      error,
    })
    sendForbidden(res, description)
  }
}
