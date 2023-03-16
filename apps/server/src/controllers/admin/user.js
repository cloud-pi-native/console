import {
  getUsers,
} from '../../models/queries/user-queries.js'

import { sendNotFound, sendOk } from '../../utils/response.js'
import { getLogInfos } from '../../utils/logger.js'

export const getUsersController = async (req, res) => {
  try {
    if (!req.session.user.groups?.includes('admin')) throw new Error('Vous n\'avez pas les droits administrateurs')
    const users = await getUsers()
    req.log.info({
      ...getLogInfos(),
      description: 'Utilisateurs récupérés avec succès',
    })
    sendOk(res, users)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Echec de récupération des utilisateurs',
      error: error.message,
    })
    sendNotFound(res, error.message)
  }
}
