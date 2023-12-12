import {
  getAllOrganizationsController,
  createOrganizationController,
  updateOrganizationController,
  fetchOrganizationsController,
} from '@/resources/organization/admin/controllers.js'
import { getAllOrganizationsSchema, createOrganizationSchema, fetchOrganizationsSchema, updateOrganizationSchema } from '@dso-console/shared'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer toutes les organisations
  app.get('/',
    {
      schema: getAllOrganizationsSchema,
    },
    getAllOrganizationsController)

  // Créer une organisation
  app.post('/',
    {
      schema: createOrganizationSchema,
    },
    createOrganizationController)

  // Synchroniser les organisations via les plugins externes
  app.put('/sync',
    {
      schema: fetchOrganizationsSchema,
    },
    fetchOrganizationsController)

  // Mettre à jour une organisation
  app.put('/:orgName',
    {
      schema: updateOrganizationSchema,
    },
    updateOrganizationController)
}

export default router
