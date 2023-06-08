import {
  getActiveOrganizations,
} from '../models/queries/organization-queries.js'
import { addReqLogs } from '../utils/logger.js'
import { sendOk, sendNotFound } from '../utils/response.js'

// GET
export const getActiveOrganizationsController = async (req, res) => {
  try {
    const organizations = await getActiveOrganizations()
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
