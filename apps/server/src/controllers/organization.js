import {
  getActiveOrganizations,
} from '../models/queries/organization-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { sendOk, sendNotFound } from '../utils/response.js'

// GET
export const getActiveOrganizationsController = async (req, res) => {
  try {
    const organizations = await getActiveOrganizations()
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
