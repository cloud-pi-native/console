import { URL } from 'node:url'
import axios from 'axios'
import { getLogInfos } from '../utils/logger.js'
import { send200, send400 } from '../utils/response.js'
import { allServices } from '../utils/services.js'
import { getUserById } from '../models/queries/user-queries.js'

export const checkServicesHealthController = async (req, res) => {
  const requestorId = req.session?.user?.id

  try {
    const user = getUserById(requestorId)
    if (!user) throw new Error('Vous n\'avez pas accès à cette information')

    const serviceData = await Promise.all(Object.values(allServices)
      .map(async service => {
        const urlParsed = new URL(service.url)
        let res
        try {
          res = await axios.get(urlParsed, { validateStatus: () => true })
          return {
            name: service.name,
            status: res.status < 400 ? 'success' : 'error',
            message: `${res?.statusText}`,
            code: res?.status,
          }
        } catch (error) {
          return {
            name: service.name,
            status: res?.status < 400 ? 'success' : 'error',
            message: `Erreur : ${error.message}`,
            code: res?.status,
          }
        }
      }))
    send200(res, serviceData)
  } catch (error) {
    let message = `Erreur : ${error.message}`
    if (error.message.match(/^Failed to parse URL from/)) message = 'Url de service invalide'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      stack: error.stack,
    })
    send400(res, message)
  }
}
