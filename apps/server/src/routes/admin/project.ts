import {
  getAllProjectsController,
  handleProjectLockingController,
} from '@/resources/project/admin/controllers.js'
import { getAllProjectsSchema } from '@dso-console/shared'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer tous les projets
  app.get('/',
    {
      schema: getAllProjectsSchema,
    },
    getAllProjectsController)

  // (Dé)verrouiller un projet
  app.put('/:projectId/locking', handleProjectLockingController)
}

export default router
