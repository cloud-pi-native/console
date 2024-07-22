import { AdminAuthorized, quotaContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

import { authUser, ErrorResType, Forbidden403 } from '@/utils/controller.js'
import { listQuotas, createQuota, deleteQuota, getQuotaAssociatedEnvironments, updateQuota } from './business.js'

export const quotaRouter = () => serverInstance.router(quotaContract, {
  // Récupérer les quotas disponibles
  listQuotas: async ({ request: req }) => {
    const user = req.session.user
    const perms = await authUser(user)
    const quotas = AdminAuthorized.isAdmin(perms.adminPermissions)
      ? await listQuotas()
      : await listQuotas(user.id)

    return {
      status: 200,
      body: quotas,
    }
  },

  // Récupérer les environnements associés au quota
  listQuotaEnvironments: async ({ request: req, params }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

    const quotaId = params.quotaId
    const body = await getQuotaAssociatedEnvironments(quotaId)
    if (body instanceof ErrorResType) return body

    return {
      status: 200,
      body,
    }
  },

  // Créer un quota
  createQuota: async ({ request: req, body: data }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

    const body = await createQuota(data)

    if (body instanceof ErrorResType) return body

    return {
      status: 201,
      body,
    }
  },

  // Modifier la confidentialité d'un quota
  updateQuota: async ({ request: req, params, body: data }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

    const quotaId = params.quotaId
    const body = await updateQuota(quotaId, data)

    if (body instanceof ErrorResType) return body
    return {
      status: 200,
      body,
    }
  },

  // Supprimer un quota
  deleteQuota: async ({ request: req, params }) => {
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()

    const quotaId = params.quotaId
    const body = await deleteQuota(quotaId)

    if (body instanceof ErrorResType) return body
    return {
      status: 204,
      body,
    }
  },
})
