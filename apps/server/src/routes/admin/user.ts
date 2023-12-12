import {
  getUsersController,
} from '@/resources/user/admin/controllers.js'
import { getUsersSchema } from '@dso-console/shared'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer tous les utilisateurs
  app.get('/',
    {
      schema: getUsersSchema,
    },
    getUsersController)
}

export default router
