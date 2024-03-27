import { addReqLogs } from '@/utils/logger.js'
import {
  createOrganization,
  fetchOrganizations,
  getAllOrganization,
  updateOrganization,
} from './business.js'
import { organizationAdminContract } from '@cpn-console/shared'
import { BadRequestError } from '@/utils/errors.js'
import { serverInstance } from '@/app.js'

export const organizationAdminRouter = () => serverInstance.router(organizationAdminContract, {

  // Récupérer toutes les organisations
  getAllOrganizations: async ({ request: req }) => {
    const organizations = await getAllOrganization()

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
    const name = params.organizationName
    const { active, label, source } = data

    const organization = await updateOrganization(name, active, label, source)
    if (!organization) throw new BadRequestError('L\'organisation n\'existe pas')

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
