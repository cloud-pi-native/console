import {
  getActiveOrganizations,
  createOrganization,
} from '../models/queries/organization-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'

// GET
export const getOrganizationsController = async (req, res) => {
  try {
    const organizations = await getActiveOrganizations()
    req.log.info({
      ...getLogInfos(),
      description: 'Organisations récupérées avec succès',
    })
    send200(res, organizations)
  } catch (error) {
    const message = 'Echec de récupération des organisations'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    send500(res, message)
  }
}

// POST
export const createOrganizationController = async (req, res) => {
  const data = req.body
  // TODO : conditionner possibilité de créer une organisation selon les droits de l'utilisateur

  try {
    const organization = await createOrganization(data)
    req.log.info({
      ...getLogInfos({
        organizationId: organization.id,
      }),
      description: 'L\'organization a bien été enregistrée en base',
    })
    send201(res, organization)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Echec d\'enregistrement de l\'organisation',
      error: error.message,
      trace: error.trace,
    })
    send500(res, error.message)
  }
}
