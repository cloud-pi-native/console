import {
  getOrganizations,
  createOrganization,
  updateActiveOrganization,
  updateLabelOrganization,
  getOrganizationByName,
} from '../../models/queries/organization-queries.js'
import { organizationSchema } from 'shared/src/schemas/organization.js'
import { adminGroupPath } from 'shared/src/utils/const.js'
import { addReqLogs } from '../../utils/logger.js'
import { sendOk, sendCreated, sendNotFound, sendBadRequest, sendForbidden } from '../../utils/response.js'

// GET
export const getAllOrganizationsController = async (req, res) => {
  if (!req.session.user.groups?.includes(adminGroupPath)) sendForbidden(res, 'Vous n\'avez pas les droits administrateur')

  try {
    const organizations = await getOrganizations()
    addReqLogs({
      req,
      description: 'Organisations récupérées avec succès',
    })
    sendOk(res, organizations)
  } catch (error) {
    const description = 'Echec de la récupération des organisations'
    addReqLogs({
      req,
      description,
      error,
    })
    sendNotFound(res, description)
  }
}

// POST
export const createOrganizationController = async (req, res) => {
  const data = req.body

  if (!req.session.user.groups?.includes(adminGroupPath)) sendForbidden(res, 'Vous n\'avez pas les droits administrateur')

  try {
    await organizationSchema.validateAsync(data)

    const isNameTaken = await getOrganizationByName(data.name)
    if (isNameTaken) throw new Error('Cette organisation existe déjà')

    const organization = await createOrganization(data)

    addReqLogs({
      req,
      description: 'Organisation créée avec succès',
      extras: {
        organizationId: organization.id,
      },
    })
    sendCreated(res, organization)
  } catch (error) {
    const description = 'Echec de la création de l\'organisation'
    addReqLogs({
      req,
      description,
      error,
    })
    sendBadRequest(res, description)
  }
}

// PUT
export const updateOrganizationController = async (req, res) => {
  const name = req.params.orgName
  const { active, label } = req.body

  if (!req.session.user.groups?.includes(adminGroupPath)) sendForbidden(res, 'Vous n\'avez pas les droits administrateur')
  try {
    if (active !== undefined) {
      await updateActiveOrganization({ name, active })
    }
    if (label) {
      await updateLabelOrganization({ name, label })
    }
    const organization = await getOrganizationByName(name)

    addReqLogs({
      req,
      description: 'Organisation mise à jour avec succès',
      extras: {
        organizationId: organization.id,
      },
    })
    sendCreated(res, organization)
  } catch (error) {
    const description = 'Echec de la mise à jour de l\'organisation'
    addReqLogs({
      req,
      description,
      extras: {
        organizationName: name,
      },
      error,
    })
    sendBadRequest(res, description)
  }
}
