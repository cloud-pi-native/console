import { FastifyInstance } from 'fastify'
import {
  getEnvironmentByIdController,
  initializeEnvironmentController,
  updateEnvironmentController,
  deleteEnvironmentController,
} from '../resources/environment/controllers.js'
import { getEnvironmentByIdSchema, initializeEnvironmentSchema, updateEnvironmentSchema, deleteEnvironmentSchema, type InitializeEnvironmentDto, type UpdateEnvironmentDto } from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer un environnement par son id
  app.get('/:projectId/environments/:environmentId',
    {
      schema: getEnvironmentByIdSchema,
    },
    getEnvironmentByIdController)

  // Créer un environnement
  app.post<{ Body: InitializeEnvironmentDto }>('/:projectId/environments',
    {
      schema: initializeEnvironmentSchema,
    },
    initializeEnvironmentController)

  // Mettre à jour un environnement
  app.put<{ Body: UpdateEnvironmentDto }>('/:projectId/environments/:environmentId',
    {
      schema: updateEnvironmentSchema,
    },
    updateEnvironmentController)

  // Supprimer un environnement
  app.delete('/:projectId/environments/:environmentId',
    {
      schema: deleteEnvironmentSchema,
    },
    deleteEnvironmentController)
}

export default router
