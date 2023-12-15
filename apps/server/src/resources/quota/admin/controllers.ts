import { type FastifyRequestWithSession } from '@/types'
import { addReqLogs } from '@/utils/logger.js'
import { sendCreated, sendNoContent, sendOk } from '@/utils/response.js'
import { createQuota, deleteQuota, getQuotaAssociatedEnvironments, updateQuotaStage, updateQuotaPrivacy } from './business.js'
import { CreateQuotaDto, QuotaParams, UpdateQuotaPrivacyDto, UpdateQuotaStageDto } from '@dso-console/shared'
import { type RouteHandler } from 'fastify'

// GET
export const getQuotaAssociatedEnvironmentsController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: QuotaParams
}>, res) => {
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
export const createQuotaController: RouteHandler = async (req: FastifyRequestWithSession<{
  Body: CreateQuotaDto
}>, res) => {
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
export const updateQuotaPrivacyController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: QuotaParams
  Body: UpdateQuotaPrivacyDto
}>, res) => {
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
export const updateQuotaStageController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: QuotaParams
  Body: UpdateQuotaStageDto
}>, res) => {
  const data = req.body

  const quotaStages = await updateQuotaStage(data)

  addReqLogs({
    req,
    description: 'Associations quota / types d\'environnement mises à jour avec succès',
    extras: {
      quotaStages: quotaStages.length + '',
    },
  })

  sendOk(res, quotaStages)
}

// DELETE
export const deleteQuotaController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: QuotaParams
}>, res) => {
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
