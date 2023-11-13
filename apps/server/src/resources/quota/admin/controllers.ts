import { EnhancedFastifyRequest } from '@/types'
import { addReqLogs } from '@/utils/logger.js'
import { sendCreated, sendNoContent, sendOk } from '@/utils/response.js'
import { createQuota, deleteQuota, getQuotaAssociatedEnvironments, updateQuotaStage, updateQuotaPrivacy } from './business.js'
import { CreateQuotaDto, DeleteQuotaDto, UpdateQuotaPrivacyDto, UpdateQuotaStageDto } from '@dso-console/shared'

// GET
export const getQuotaAssociatedEnvironmentsController = async (req: EnhancedFastifyRequest<DeleteQuotaDto>, res) => {
  const quotaId = req.params.quotaId

  const environments = await getQuotaAssociatedEnvironments(quotaId)

  addReqLogs({
    req,
    description: 'Environnements associés au quota récupérés',
    extras: {
      quotaId,
    },
  })

  sendOk(res, environments)
}

// POST
export const createQuotaController = async (req: EnhancedFastifyRequest<CreateQuotaDto>, res) => {
  const data = req.body

  const quota = await createQuota(data)

  addReqLogs({
    req,
    description: 'Quota créé avec succès',
    extras: {
      quotaId: quota.id,
    },
  })

  sendCreated(res, quota)
}

// PATCH
export const updateQuotaPrivacyController = async (req: EnhancedFastifyRequest<UpdateQuotaPrivacyDto>, res) => {
  const quotaId = req.params.quotaId
  const isPrivate = req.body.isPrivate

  const quota = await updateQuotaPrivacy(quotaId, isPrivate)

  addReqLogs({
    req,
    description: 'Confidentialité du quota mise à jour avec succès',
    extras: {
      quotaId: quota.id,
    },
  })

  sendOk(res, quota)
}

// PUT
export const updateQuotaStageController = async (req: EnhancedFastifyRequest<UpdateQuotaStageDto>, res) => {
  const data = req.body

  const quotaStages = await updateQuotaStage(data)

  addReqLogs({
    req,
    description: 'Associations quota / stages mises à jour avec succès',
    extras: {
      quotaStages: quotaStages.length + '',
    },
  })

  sendOk(res, quotaStages)
}

// DELETE
export const deleteQuotaController = async (req: EnhancedFastifyRequest<DeleteQuotaDto>, res) => {
  const quotaId = req.params.quotaId

  await deleteQuota(quotaId)

  addReqLogs({
    req,
    description: 'Quota supprimé avec succès',
    extras: {
      quotaId,
    },
  })

  sendNoContent(res)
}
