import { AdminAuthorized, organizationContract } from '@cpn-console/shared'
import {
  createOrganization,
  fetchOrganizations,
  listOrganizations,
  updateOrganization,
} from './business.js'
import { serverInstance } from '@/app.js'

import { authUser } from '@/utils/controller.js'
import { ErrorResType, Forbidden403 } from '@/utils/errors.js'

export function organizationRouter() {
  return serverInstance.router(organizationContract, {
    listOrganizations: async ({ query }) => {
      const organizations = await listOrganizations(query)

      return {
        status: 200,
        body: organizations,
      }
    },

    // Créer une organisation
    createOrganization: async ({ request: req, body: data }) => {
      const requestor = req.session.user
      const perms = await authUser(requestor)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
      const body = await createOrganization(data)

      if (body instanceof ErrorResType) return body

      return {
        status: 201,
        body,
      }
    },

    // Synchroniser les organisations via les plugins externes
    syncOrganizations: async ({ request: req }) => {
      const requestor = req.session.user
      const { adminPermissions, user } = await authUser(requestor)
      if (!AdminAuthorized.isAdmin(adminPermissions)) return new Forbidden403()

      const body = await fetchOrganizations(user.id, req.id)

      if (body instanceof ErrorResType) return body

      return {
        status: 200,
        body,
      }
    },

    // Mettre à jour une organisation
    updateOrganization: async ({ request: req, body: data, params }) => {
      const requestor = req.session.user
      const perms = await authUser(requestor)
      if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
      const name = params.organizationName

      const body = await updateOrganization(name, data)
      if (body instanceof ErrorResType) return body

      return {
        status: 200,
        body,
      }
    },
  })
}
