import {
  getOrganizations,
  createOrganization,
} from '../models/queries/organization-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'

// GET
export const getOrganizationsController = async (req, res) => {
  try {
    // TODO : besoin d'un contrôle ici (user session ?)
    const organizations = await getOrganizations()
    req.log.info({
      ...getLogInfos(),
      description: 'Organizations successfully retreived',
    })
    await send200(res, organizations)
  } catch (error) {
    const message = 'Cannot retrieve organizations'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// POST
export const createOrganizationController = async (req, res) => {
  const data = req.body

  try {
    // TODO : besoin d'un contrôle ici (user session ?)
    const organization = await createOrganization(data)
    req.log.info({
      ...getLogInfos({
        organizationId: organization.id,
      }),
      description: 'Organization successfully created in database',
    })
    send201(res, organization)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot create organization',
      error: error.message,
    })
    return send500(res, error.message)
  }
}
