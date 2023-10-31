import { EnhancedFastifyRequest } from '@/types'
import { addReqLogs } from '@/utils/logger.js'
import { sendCreated, sendNoContent, sendOk } from '@/utils/response.js'
import { createStage, getStageAssociatedEnvironments, deleteStage, updateStageClusters } from './business.js'
import { CreateStageDto, DeleteStageDto, UpdateStageClustersDto } from '@dso-console/shared'

// GET
export const getStageAssociatedEnvironmentsController = async (req: EnhancedFastifyRequest<DeleteStageDto>, res) => {
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
export const createStageController = async (req: EnhancedFastifyRequest<CreateStageDto>, res) => {
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
export const updateStageClustersController = async (req: EnhancedFastifyRequest<UpdateStageClustersDto>, res) => {
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
export const deleteStageController = async (req: EnhancedFastifyRequest<DeleteStageDto>, res) => {
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
