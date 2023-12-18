import {
  updateQuotaStageController,
} from '@/resources/quota/admin/controllers.js'

import {
  getStageAssociatedEnvironmentsController,
  createStageController,
  deleteStageController,
  updateStageClustersController,
} from '@/resources/stage/admin/controllers.js'
import { createStageSchema, deleteStageSchema, getStageAssociatedEnvironmentsSchema, updateQuotaStageSchema, updateStageClustersSchema } from '@dso-console/shared'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les environnements associés au stage
  app.get('/:stageId/environments',
    {
      schema: getStageAssociatedEnvironmentsSchema,
    },
    getStageAssociatedEnvironmentsController)

  // Créer un stage
  app.post('/',
    {
      schema: createStageSchema,
    },
    createStageController)

  // Modifier une association quota / stage
  app.put('/quotastages',
    {
      schema: updateQuotaStageSchema,
    },
    updateQuotaStageController)

  // Modifier une association stage / clusters
  app.put('/:stageId/clusters',
    {
      schema: updateStageClustersSchema,
    },
    updateStageClustersController)

  // Supprimer un stage
  app.delete('/:stageId',
    {
      schema: deleteStageSchema,
    },
    deleteStageController)
}

export default router
