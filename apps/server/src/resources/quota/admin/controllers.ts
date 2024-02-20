import { addReqLogs } from '@/utils/logger.js'
import { sendCreated, sendNoContent, sendOk } from '@/utils/response.js'
import { createQuota, deleteQuota, getQuotaAssociatedEnvironments, updateQuotaStage, updateQuotaPrivacy } from './business.js'
import type { FastifyInstance } from 'fastify'

import { createQuotaSchema, deleteQuotaSchema, getQuotaAssociatedEnvironmentsSchema, updateQuotaPrivacySchema, updateQuotaStageSchema } from '@cpn-console/shared'
import { FromSchema } from 'json-schema-to-ts'

const router = async (app: FastifyInstance, _opt) => {
  // Récupérer les environnements associés au quota
  app.get<{
    Params: FromSchema<typeof getQuotaAssociatedEnvironmentsSchema['params']>
  }>('/:quotaId/environments',
    {
      schema: getQuotaAssociatedEnvironmentsSchema,
    },
    async (req, res) => {
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
    })

  // Créer un quota
  app.post<{
    Body: FromSchema<typeof createQuotaSchema['body']>
  }>('/',
    {
      schema: createQuotaSchema,
    },
    async (req, res) => {
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
    })

  // Modifier une association quota / stage
  app.put<{
    Body: FromSchema<typeof updateQuotaStageSchema['body']>
  }>('/quotastages',
    {
      schema: updateQuotaStageSchema,
    },
    async (req, res) => {
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
    })

  // Modifier la confidentialité d'un quota
  app.patch<{
    Params: FromSchema<typeof updateQuotaPrivacySchema['params']>,
    Body: FromSchema<typeof updateQuotaPrivacySchema['body']>
  }>('/:quotaId/privacy',
    {
      schema: updateQuotaPrivacySchema,
    },
    async (req, res) => {
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
    })

  // Supprimer un quota
  app.delete<{
    Params: FromSchema<typeof deleteQuotaSchema['params']>
  }>('/:quotaId',
    {
      schema: deleteQuotaSchema,
    },
    async (req, res) => {
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
    })
}

export default router
