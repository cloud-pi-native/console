import { getLogInfos } from '../utils/logger.js'
import { send200, send400 } from '../utils/response.js'
import { allServices } from '../utils/services.js'
import { getUserById } from '../models/queries/user-queries.js'

// GET
export const checkServicesHealthController = async (req, res) => {
  const requestorId = req.session?.user?.id

  try {
    const user = getUserById(requestorId)
    if (!user) throw new Error('Vous n\'avez pas accès à cette information')

    const serviceData = await Promise
      .all(Object.values(allServices)
        .map(async service => {
          const serviceRes = await fetch(service.url)
          return ({
            id: service.id,
            status: serviceRes.status < 400 ? 'success' : 'error',
            message: serviceRes?.statusText,
            code: serviceRes.status,
          })
        }))
    return send200(res, serviceData)
  } catch (error) {
    let message
    if (error.message.match(/^Failed to parse URL from/)) message = 'Url de service invalide'
    else message = `Erreur : ${error?.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error?.message,
    })
    send400(res, message)
  }
}
