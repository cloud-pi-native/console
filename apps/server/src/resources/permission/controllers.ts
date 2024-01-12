import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { deletePermission, getEnvironmentPermissions, setPermission, updatePermission } from './business.js'
import type { FastifyInstance } from 'fastify'

import { deletePermissionSchema, getEnvironmentPermissionsSchema, setPermissionSchema, updatePermissionSchema } from '@dso-console/shared'
import { FromSchema } from 'json-schema-to-ts'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les permissions d'un environnement
  app.get<{
    Params: FromSchema<typeof getEnvironmentPermissionsSchema['params']>
  }>('/:projectId/environments/:environmentId/permissions',
    {
      schema: getEnvironmentPermissionsSchema,
    },
    async (req, res) => {
      const userId = req.session.user.id
      const environmentId = req.params.environmentId
      const projectId = req.params.projectId

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
    })

  // Créer une permission
  app.post<{
    Params: FromSchema<typeof setPermissionSchema['params']>
    Body: FromSchema<typeof setPermissionSchema['body']>
  }>('/:projectId/environments/:environmentId/permissions',
    {
      schema: setPermissionSchema,
    },
    async (req, res) => {
      const requestorId = req.session.user?.id
      const environmentId = req.params.environmentId
      const projectId = req.params.projectId
      const data = req.body

      const permission = await setPermission(projectId, requestorId, data.userId, environmentId, data.level, req.id)

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
    })

  // Mettre à jour le level d'une permission
  app.put<{
    Params: FromSchema<typeof updatePermissionSchema['params']>
    Body: FromSchema<typeof updatePermissionSchema['body']>
  }>('/:projectId/environments/:environmentId/permissions',
    {
      schema: updatePermissionSchema,
    },
    async (req, res) => {
      const requestorId = req.session.user.id
      const environmentId = req.params.environmentId
      const projectId = req.params.projectId
      const data = req.body

      const permission = await updatePermission(projectId, requestorId, data.userId, environmentId, data.level, req.id)

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
    })

  // Supprimer une permission
  app.delete<{
    Params: FromSchema<typeof deletePermissionSchema['params']>
  }>('/:projectId/environments/:environmentId/permissions/:userId',
    {
      schema: deletePermissionSchema,
    },
    async (req, res) => {
      const requestorId = req.session.user.id
      const environmentId = req.params.environmentId
      const projectId = req.params.projectId
      const userId = req.params.userId

      const permission = await deletePermission(userId, environmentId, requestorId, req.id)

      addReqLogs({
        req,
        description: 'Permissions supprimée avec succès',
        extras: {
          projectId,
          environmentId,
        },
      })
      sendOk(res, permission)
    })
}

export default router
