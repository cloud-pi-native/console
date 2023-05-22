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
import { sendOk, sendCreated, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
// import hooksFns from '../plugins/index.js'

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
      description: 'Permissions récupérées',
    })
    sendOk(res, permissions)
  } catch (error) {
    const message = `Permissions non trouvées: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendNotFound(res, message)
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
    req.log.info({
      ...getLogInfos(),
      description: 'Permission enregistrée',
    })
    sendCreated(res, permission)
  } catch (error) {
    const message = `Permissions non créées : ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendBadRequest(res, message)
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
    req.log.info({
      ...getLogInfos(),
      description: 'Permission mise à jour',
    })
    sendOk(res, permission)
  } catch (error) {
    const message = `Permission non modifiée : ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendBadRequest(res, message)
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

    const message = 'Permission supprimée'
    req.log.info({
      ...getLogInfos({ permission }),
      description: message,
    })
    sendOk(res, permission)
  } catch (error) {
    const message = `Permission non supprimée : ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendForbidden(res, message)
  }
}
