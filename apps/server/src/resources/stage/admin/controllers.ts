import type { FastifyInstance } from 'fastify'
import type { FromSchema } from 'json-schema-to-ts'
import { addReqLogs } from '@/utils/logger.js'
import { sendCreated, sendNoContent, sendOk } from '@/utils/response.js'
import { createStage, getStageAssociatedEnvironments, deleteStage, updateStageClusters } from './business.js'
import {
  createStageSchema,
  deleteStageSchema,
  getStageAssociatedEnvironmentsSchema,
  updateStageClustersSchema,
} from '@dso-console/shared'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les environnements associés au stage
  app.get<{
    Params: FromSchema<typeof getStageAssociatedEnvironmentsSchema['params']>,
  }>('/:stageId/environments',
    {
      schema: getStageAssociatedEnvironmentsSchema,
    },
    async (req, res) => {
      const stageId = req.params.stageId

      const environments = await getStageAssociatedEnvironments(stageId)

      addReqLogs({
        req,
        description: 'Environnements associés au type d\'environnement récupérés',
        extras: {
          stageId,
        },
      })

      sendOk(res, environments)
    },
  )

  // Créer un stage
  app.post<{
  Body: FromSchema<typeof createStageSchema['body']>,
}>('/',
  {
    schema: createStageSchema,
  },
  async (req, res) => {
    const data = req.body

    const stage = await createStage(data)

    addReqLogs({
      req,
      description: 'Type d\'environnement créé avec succès',
      extras: {
        stageId: stage.id,
      },
    })

    sendCreated(res, stage)
  })

  // ce endpoint est dupliquer de quota, tout d'abord il ne devrait pas exister et surtout n'y avoir qu'un seul point d'entrée
  // // Modifier une association quota / stage
  // app.put('/quotastages',
  //   {
  //     schema: updateQuotaStageSchema,
  //   },
  //   updateQuotaStageController)

  // Modifier une association stage / clusters
  app.patch<{
  Params: FromSchema<typeof updateStageClustersSchema['params']>,
  Body: FromSchema<typeof updateStageClustersSchema['body']>,
}>('/:stageId/clusters',
  {
    schema: updateStageClustersSchema,
  },
  async (req, res) => {
    const stageId = req.params.stageId
    const clusterIds = req.body.clusterIds

    const stage = await updateStageClusters(stageId, clusterIds)

    addReqLogs({
      req,
      description: 'Type d\'environnement mis à jour avec succès',
      extras: {
        stageId,
      },
    })

    sendOk(res, stage)
  })

  // Supprimer un stage
  app.delete<{
    Params: FromSchema<typeof deleteStageSchema['params']>,
  }>('/:stageId',
    {
      schema: deleteStageSchema,
    },
    async (req, res) => {
      const stageId = req.params.stageId

      await deleteStage(stageId)

      addReqLogs({
        req,
        description: 'Type d\'environnement supprimé avec succès',
        extras: {
          stageId,
        },
      })

      sendNoContent(res)
    })
}

export default router
