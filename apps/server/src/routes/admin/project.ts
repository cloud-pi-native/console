import {
  getAllProjectsController,
} from '@/resources/project/admin/controllers.js'
import { getAllProjectsSchema } from '@dso-console/shared'
import { FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer tous les projets
  app.get('/',
    {
      schema: getAllProjectsSchema,
    },
    getAllProjectsController)
}

export default router
