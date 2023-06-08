import {
  getUsers,
} from '../../models/queries/user-queries.js'

import { sendNotFound, sendOk } from '../../utils/response.js'
import { addReqLogs } from '../../utils/logger.js'

export const getUsersController = async (req, res) => {
  try {
    const users = await getUsers()

    addReqLogs({
      req,
      description: 'Ensemble des utilisateurs récupérés avec succès',
    })
    sendOk(res, users)
  } catch (error) {
    const description = 'Echec de la récupération de l\'ensemble des utilisateurs'
    addReqLogs({
      req,
      description,
      error,
    })
    sendNotFound(res, error.message)
  }
}
