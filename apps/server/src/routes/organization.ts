import {
  getActiveOrganizationsController,
} from '@/resources/organization/controllers.js'
import { getActiveOrganizationsSchema } from '@dso-console/shared'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  app.get('/',
    {
      schema: getActiveOrganizationsSchema,
    },
    getActiveOrganizationsController)
}

export default router
