import { AdminAuthorized, organizationContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

import {
  createOrganization,
  fetchOrganizations,
  listOrganizations,
  updateOrganization,
} from './business.js'
import { authUser, ErrorResType, Forbidden403 } from '@/utils/controller.js'

export const organizationRouter = () => serverInstance.router(organizationContract, {
  listOrganizations: async ({ query }) => {
    const organizations = await listOrganizations(query)

    return {
      status: 200,
      body: organizations,
    }
  },

  // Créer une organisation
  createOrganization: async ({ request: req, body: data }) => {
    const user = req.session.user
    const perms = await authUser(user)
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
    const user = req.session.user
    const perms = await authUser(user)
    if (!AdminAuthorized.isAdmin(perms.adminPermissions)) return new Forbidden403()
    const body = await fetchOrganizations(user.id, req.id)

    if (body instanceof ErrorResType) return body

    return {
      status: 200,
      body,
    }
  },

  // Mettre à jour une organisation
  updateOrganization: async ({ request: req, body: data, params }) => {
    const user = req.session.user
    const perms = await authUser(user)
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
