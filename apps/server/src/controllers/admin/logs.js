import { adminGroupPath } from 'shared/src/utils/const.js'
import { sendForbidden, sendNotFound, sendOk } from '../../utils/response.js'
import { getAllLogs } from '../../models/queries/log-queries.js'

export const getLogsController = async (req, res) => {
  if (!req.session.user.groups?.includes(adminGroupPath)) sendForbidden(res, 'Vous n\'avez pas les droits administrateur')

  try {
    const logs = await getAllLogs()

    sendOk(res, logs)
  } catch (error) {
    const description = 'Echec de la récupération des organisations'
    sendNotFound(res, description)
  }
}
