import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { deletePermission, getEnvironmentPermissions, setPermission, updatePermission } from './business.js'
import { type RouteHandler } from 'fastify'
import { type FastifyRequestWithSession } from '@/types/index.js'
import type { DeletePermissionParams, PermissionParams, UpdatePermissionDto } from '@dso-console/shared'

// GET
export const getEnvironmentPermissionsController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: PermissionParams
}>, res) => {
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
export const setPermissionController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: PermissionParams
  Body: UpdatePermissionDto
}>, res) => {
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
export const updatePermissionController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: PermissionParams
  Body: UpdatePermissionDto
}>, res) => {
  const requestorId = req.session?.user?.id
  const environmentId = req.params?.environmentId
  const projectId = req.params?.projectId
  const data = req.body

  const permission = await updatePermission(projectId, requestorId, data.userId, environmentId, data.level)

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
export const deletePermissionController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: DeletePermissionParams
}>, res) => {
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
