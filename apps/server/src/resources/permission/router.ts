import { addReqLogs } from '@/utils/logger.js'
import {
  deletePermission,
  getEnvironmentPermissions,
  upsertPermission,
} from './business.js'
import { permissionContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export const permissionRouter = () => serverInstance.router(permissionContract, {

  // Récupérer toutes les permissions d'un environnement
  listPermissions: async ({ request: req, params }) => {
    const userId = req.session.user.id
    const environmentId = params.environmentId
    const projectId = params.projectId

    const permissions = await getEnvironmentPermissions(userId, projectId, environmentId)

    addReqLogs({
      req,
      message: 'Permissions de l\'environnement récupérées avec succès',
      infos: {
        projectId,
        environmentId,
      },
    })
    return {
      status: 200,
      body: permissions,
    }
  },

  // Mettre à jour le level d'une permission
  upsertPermission: async ({ request: req, params, body: data }) => {
    const requestorId = req.session.user.id
    const environmentId = params.environmentId
    const projectId = params.projectId

    if (typeof data.level === 'string') data.level = parseInt(data.level)
    const permission = await upsertPermission(projectId, requestorId, data.userId, environmentId, data.level, req.id)

    addReqLogs({
      req,
      message: 'Permission mise à jour avec succès',
      infos: {
        projectId,
        environmentId,
      },
    })
    return {
      status: 200,
      body: permission,
    }
  },

  // Supprimer une permission
  deletePermission: async ({ request: req, params }) => {
    const requestorId = req.session.user.id
    const environmentId = params.environmentId
    const projectId = params.projectId
    const userId = params.userId

    await deletePermission(userId, environmentId, requestorId, req.id)

    addReqLogs({
      req,
      message: 'Permissions supprimée avec succès',
      infos: {
        projectId,
        environmentId,
      },
    })
    return {
      status: 204,
      body: null,
    }
  },
})
