import type { AsyncReturnType } from '@cpn-console/shared'
import { AdminAuthorized, quotaContract } from '@cpn-console/shared'
import { createQuota, deleteQuota, getQuotaAssociatedEnvironments, listQuotas, updateQuota } from './business'
import { serverInstance } from '@/app'
import { authUser } from '@/utils/controller'
import { ErrorResType, Forbidden403 } from '@/utils/errors'

export function quotaRouter() {
  return serverInstance.router(quotaContract, {
  // Récupérer les quotas disponibles
    listQuotas: async ({ request: req }) => {
      const { user, adminPermissions } = await authUser(req)

      let body: AsyncReturnType<typeof listQuotas>
      if (AdminAuthorized.isAdmin(adminPermissions)) {
        body = await listQuotas()
      } else if (user) {
        body = await listQuotas(user.id)
      } else {
        body = [] as AsyncReturnType<typeof listQuotas>
      }

      return {
        status: 200,
        body,
      }
    },

    // Récupérer les environnements associés au quota
    listQuotaEnvironments: async ({ request: req, params }) => {
      const perms = await authUser(req)
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
      const perms = await authUser(req)
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
      const perms = await authUser(req)
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
      const perms = await authUser(req)
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
}
