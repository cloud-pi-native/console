import { addReqLogs } from '@/utils/logger.js'
import { createQuota, deleteQuota, getQuotaAssociatedEnvironments, updateQuota } from './business.js'
import { quotaAdminContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export const quotaAdminRouter = () => serverInstance.router(quotaAdminContract, {
  // Récupérer les environnements associés au quota
  getQuotaEnvironments: async ({ request: req, params }) => {
    const quotaId = params.quotaId

    const environments = await getQuotaAssociatedEnvironments(quotaId)

    addReqLogs({
      req,
      message: 'Environnements associés au quota récupérés',
      infos: {
        quotaId,
      },
    })

    return {
      status: 200,
      body: environments,
    }
  },

  // Créer un quota
  createQuota: async ({ request: req, body: data }) => {
    const quota = await createQuota(data)

    addReqLogs({
      req,
      message: 'Quota créé avec succès',
      infos: {
        quotaId: quota.id,
      },
    })

    return {
      status: 201,
      body: quota,
    }
  },

  // Modifier la confidentialité d'un quota
  updateQuota: async ({ request: req, params, body: data }) => {
    const quotaId = params.quotaId

    const quota = await updateQuota(quotaId, data)

    addReqLogs({
      req,
      message: 'Confidentialité du quota mise à jour avec succès',
      infos: {
        quotaId: quota.id,
      },
    })

    return {
      status: 200,
      body: quota,
    }
  },

  // Supprimer un quota
  deleteQuota: async ({ request: req, params }) => {
    const quotaId = params.quotaId

    await deleteQuota(quotaId)

    addReqLogs({
      req,
      message: 'Quota supprimé avec succès',
      infos: {
        quotaId,
      },
    })

    return {
      status: 204,
      body: null,
    }
  },
})
