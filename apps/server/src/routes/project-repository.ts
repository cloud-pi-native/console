import {
  getRepositoryByIdController,
  getProjectRepositoriesController,
  createRepositoryController,
  updateRepositoryController,
  deleteRepositoryController,
} from '@/resources/repository/controllers.js'
import { createRepositorySchema, deleteRepositorySchema, getProjectRepositoriesSchema, getRepositoryByIdSchema, updateRepositorySchema } from '@dso-console/shared'
import { FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer un repository par son id
  app.get('/:projectId/repositories/:repositoryId',
    {
      schema: getRepositoryByIdSchema,
    },
    getRepositoryByIdController)

  // Récupérer tous les repositories d'un projet
  app.get('/:projectId/repositories',
    {
      schema: getProjectRepositoriesSchema,
    },
    getProjectRepositoriesController)

  // Créer un repository
  app.post('/:projectId/repositories',
    {
      schema: createRepositorySchema,
    },
    createRepositoryController)

  // Mettre à jour un repository
  app.put('/:projectId/repositories/:repositoryId',
    {
      schema: updateRepositorySchema,
    },
    updateRepositoryController)

  // Supprimer un repository
  app.delete('/:projectId/repositories/:repositoryId',
    {
      schema: deleteRepositorySchema,
    },
    deleteRepositoryController)
}

export default router
