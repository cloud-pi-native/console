import { organizationContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { addReqLogs } from '@/utils/logger.js'
import {
  createOrganization,
  fetchOrganizations,
  listOrganizations,
  updateOrganization,
} from './business.js'
import { assertIsAdmin } from '@/utils/controller.js'

export const organizationRouter = () => serverInstance.router(organizationContract, {
  listOrganizations: async ({ request: req, query }) => {
    const organizations = await listOrganizations(query)

    addReqLogs({
      req,
      message: 'Organisations récupérées avec succès',
    })
    return {
      status: 200,
      body: organizations,
    }
  },

  // Créer une organisation
  createOrganization: async ({ request: req, body: data }) => {
    assertIsAdmin(req.session.user)
    const organization = await createOrganization(data)

    addReqLogs({
      req,
      message: 'Organisation créée avec succès',
      infos: {
        organizationId: organization.id,
      },
    })
    return {
      status: 201,
      body: organization,
    }
  },

  // Synchroniser les organisations via les plugins externes
  syncOrganizations: async ({ request: req }) => {
    assertIsAdmin(req.session.user)
    const userId = req.session.user.id

    const consoleOrganizations = await fetchOrganizations(userId, req.id)

    addReqLogs({
      req,
      message: 'Organisations synchronisées avec succès',
    })
    return {
      status: 200,
      body: consoleOrganizations,
    }
  },

  // Mettre à jour une organisation
  updateOrganization: async ({ request: req, body: data, params }) => {
    assertIsAdmin(req.session.user)
    const name = params.organizationName

    const organization = await updateOrganization(name, data)

    addReqLogs({
      req,
      message: 'Organisation mise à jour avec succès',
      infos: {
        organizationId: organization.id,
      },
    })
    return {
      status: 200,
      body: organization,
    }
  },
})
