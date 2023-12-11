import {
  getEnvironmentPermissionsController,
  setPermissionController,
  updatePermissionController,
  deletePermissionController,
} from '@/resources/permission/controllers.js'
import { deletePermissionSchema, getEnvironmentPermissionsSchema, setPermissionSchema, updatePermissionSchema } from '@dso-console/shared'
import { FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les permissions d'un environnement
  app.get('/:projectId/environments/:environmentId/permissions',
    {
      schema: getEnvironmentPermissionsSchema,
    },
    getEnvironmentPermissionsController)

  // Créer une permission
  app.post('/:projectId/environments/:environmentId/permissions',
    {
      schema: setPermissionSchema,
    },
    setPermissionController)

  // Mettre à jour le level d'une permission
  app.put('/:projectId/environments/:environmentId/permissions',
    {
      schema: updatePermissionSchema,
    },
    updatePermissionController)

  // Supprimer une permission
  app.delete('/:projectId/environments/:environmentId/permissions/:userId',
    {
      schema: deletePermissionSchema,
    },
    deletePermissionController)
}

export default router
