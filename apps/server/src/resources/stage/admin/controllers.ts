import { type FastifyRequestWithSession } from '@/types'
import { addReqLogs } from '@/utils/logger.js'
import { sendCreated, sendNoContent, sendOk } from '@/utils/response.js'
import { createStage, getStageAssociatedEnvironments, deleteStage, updateStageClusters } from './business.js'
import { CreateStageDto, UpdateStageClustersDto, StageParams } from '@dso-console/shared'
import { type RouteHandler } from 'fastify'

// GET
export const getStageAssociatedEnvironmentsController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: StageParams,
}>, res) => {
  const stageId = req.params.stageId

  const environments = await getStageAssociatedEnvironments(stageId)

  addReqLogs({
    req,
    description: 'Environnements associés au stage récupérés',
    extras: {
      stageId,
    },
  })

  sendOk(res, environments)
}

// POST
export const createStageController: RouteHandler = async (req: FastifyRequestWithSession<{
  Body: CreateStageDto,
}>, res) => {
  const data = req.body

  const stage = await createStage(data)

  addReqLogs({
    req,
    description: 'Stage créé avec succès',
    extras: {
      stageId: stage.id,
    },
  })

  sendCreated(res, stage)
}

// PATCH
export const updateStageClustersController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: StageParams,
  Body: UpdateStageClustersDto,
}>, res) => {
  const stageId = req.params.stageId
  const clusterIds = req.body.clusterIds

  const stage = await updateStageClusters(stageId, clusterIds)

  addReqLogs({
    req,
    description: 'Stage créé avec succès',
    extras: {
      stageId,
    },
  })

  sendOk(res, stage)
}

// DELETE
export const deleteStageController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: StageParams,
}>, res) => {
  const stageId = req.params.stageId

  await deleteStage(stageId)

  addReqLogs({
    req,
    description: 'Stage supprimé avec succès',
    extras: {
      stageId,
    },
  })

  sendNoContent(res)
}
