import {
  getQuotaAssociatedEnvironmentsController,
  createQuotaController,
  deleteQuotaController,
  updateQuotaStageController,
  updateQuotaPrivacyController,
} from '@/resources/quota/admin/controllers.js'
import { createQuotaSchema, deleteQuotaSchema, getQuotaAssociatedEnvironmentsSchema, updateQuotaPrivacySchema, updateQuotaStageSchema } from '@dso-console/shared'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les environnements associés au quota
  app.get('/:quotaId/environments',
    {
      schema: getQuotaAssociatedEnvironmentsSchema,
    },
    getQuotaAssociatedEnvironmentsController)

  // Créer un quota
  app.post('/',
    {
      schema: createQuotaSchema,
    },
    createQuotaController)

  // Modifier une association quota / stage
  app.put('/quotastages',
    {
      schema: updateQuotaStageSchema,
    },
    updateQuotaStageController)

  // Modifier la confidentialité d'un quota
  app.put('/:quotaId/privacy',
    {
      schema: updateQuotaPrivacySchema,
    },
    updateQuotaPrivacyController)

  // Supprimer un quota
  app.delete('/:quotaId',
    {
      schema: deleteQuotaSchema,
    },
    deleteQuotaController)
}

export default router
