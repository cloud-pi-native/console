import { quotaContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { addReqLogs } from '@/utils/logger.js'
import { assertIsAdmin } from '@/utils/controller.js'
import { listQuotas, createQuota, deleteQuota, getQuotaAssociatedEnvironments, updateQuota } from './business.js'

export const quotaRouter = () => serverInstance.router(quotaContract, {
  // Récupérer les quotas disponibles
  listQuotas: async ({ request: req }) => {
    const user = req.session.user
    const quotas = await listQuotas(user)

    addReqLogs({
      req,
      message: 'Quotas récupérés avec succès',
    })
    return {
      status: 200,
      body: quotas,
    }
  },

  // Récupérer les environnements associés au quota
  listQuotaEnvironments: async ({ request: req, params }) => {
    const quotaId = params.quotaId

    assertIsAdmin(req.session.user)
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
    assertIsAdmin(req.session.user)
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

    assertIsAdmin(req.session.user)
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

    assertIsAdmin(req.session.user)
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
