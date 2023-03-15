import { getLogInfos } from '../utils/logger.js'
import { send200, send500 } from '../utils/response.js'

import {
  getRoleByUserIdAndProjectId,
} from '../models/queries/users-projects-queries.js'

// POST
export const checkServiceHealthController = async (req, res) => {
  const requestorId = req.session?.user?.id
  const projectId = req.params.projectId
  const data = req.body

  try {
    const role = await getRoleByUserIdAndProjectId(requestorId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const serviceRes = await fetch(data.to)
    const serviceStatus = serviceRes.status === 200 ? 'success' : 'error'

    return send200(res, serviceStatus)
  } catch (error) {
    let message
    if (error.message.match(/^Failed to parse URL from/)) message = `Url de service invalide : ${data.to}`
    else message = `Erreur : ${error?.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error?.message,
    })
    send500(res, message)
  }
}
