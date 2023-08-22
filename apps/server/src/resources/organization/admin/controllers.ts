import { addReqLogs } from '@/utils/logger.js'
import { sendOk, sendCreated } from '@/utils/response.js'
import { createOrganizationBusiness, fetchOrganizationsBusiness, getAllOrganizationBusiness, updateOrganizationBusiness } from './business.js'

// GET
export const getAllOrganizationsController = async (req, res) => {
  const organizations = await getAllOrganizationBusiness()
  addReqLogs({
    req,
    description: 'Organisations récupérées avec succès',
  })
  sendOk(res, organizations)
}

// POST
export const createOrganizationController = async (req, res) => {
  const data = req.body
  const organization = await createOrganizationBusiness(data)

  addReqLogs({
    req,
    description: 'Organisation créée avec succès',
    extras: {
      organizationId: organization.id,
    },
  })
  sendCreated(res, organization)
}

// PUT
export const updateOrganizationController = async (req, res) => {
  const name = req.params.orgName
  const { active, label, source } = req.body

  const organization = await updateOrganizationBusiness(name, active, label, source)

  addReqLogs({
    req,
    description: 'Organisation mise à jour avec succès',
    extras: {
      organizationId: organization.id,
    },
  })
  sendCreated(res, organization)
}

export const fetchOrganizationsController = async (req, res) => {
  const userId = req.session.user.id

  const consoleOrganizations = await fetchOrganizationsBusiness(userId)

  addReqLogs({
    req,
    description: 'Organisations synchronisées avec succès',
  })
  sendCreated(res, consoleOrganizations)
}
