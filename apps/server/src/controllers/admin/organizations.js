import {
  getOrganizations,
  createOrganization,
  updateActiveOrganization,
  updateLabelOrganization,
  getOrganizationByName,
} from '../../models/queries/organization-queries.js'
import { organizationSchema } from 'shared/src/schemas/organization.js'
import { adminGroupPath } from 'shared/src/utils/const.js'
import { getLogInfos } from '../../utils/logger.js'
import { sendOk, sendCreated, sendNotFound, sendBadRequest, sendForbidden } from '../../utils/response.js'

// GET
export const getAllOrganizationsController = async (req, res) => {
  if (!req.session.user.groups?.includes(adminGroupPath)) sendForbidden(res, 'Vous n\'avez pas les droits administrateurs')

  try {
    const organizations = await getOrganizations()
    req.log.info({
      ...getLogInfos(),
      description: 'Organisations récupérées avec succès',
    })
    sendOk(res, organizations)
  } catch (error) {
    const message = 'Echec de récupération des organisations'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    sendNotFound(res, message)
  }
}

// POST
export const createOrganizationController = async (req, res) => {
  const data = req.body

  if (!req.session.user.groups?.includes(adminGroupPath)) sendForbidden(res, 'Vous n\'avez pas les droits administrateurs')

  try {
    await organizationSchema.validateAsync(data)

    const isNameTaken = await getOrganizationByName(data.name)
    if (isNameTaken) throw new Error('Cette organisation existe déjà')

    const organization = await createOrganization(data)
    req.log.info({
      ...getLogInfos({
        organizationId: organization.id,
      }),
      description: 'L\'organisation a bien été enregistrée en base',
    })
    sendCreated(res, organization)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Echec d\'enregistrement de l\'organisation',
      error: error.message,
      trace: error.trace,
    })
    sendBadRequest(res, error.message)
  }
}

// PUT
export const updateOrganizationController = async (req, res) => {
  const name = req.params.orgName
  const { active, label } = req.body

  if (!req.session.user.groups?.includes(adminGroupPath)) sendForbidden(res, 'Vous n\'avez pas les droits administrateurs')
  try {
    if (active !== undefined) {
      await updateActiveOrganization({ name, active })
    }
    if (label) {
      await updateLabelOrganization({ name, label })
    }
    const organization = await getOrganizationByName(name)
    req.log.info({
      ...getLogInfos({
        organizationId: organization.id,
      }),
      description: 'L\'organisation a bien été mise à jour',
    })
    sendCreated(res, organization)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Echec de mise à jour de l\'organisation',
      error: error.message,
      trace: error.trace,
    })
    sendBadRequest(res, error.message)
  }
}
