import { getLogInfos } from '../utils/logger.js'
import { send200, send400 } from '../utils/response.js'
import { allServices } from '../utils/services.js'
import { getUserById } from '../models/queries/user-queries.js'
import HttpsProxyAgent from 'https-proxy-agent'

import https from 'node:https'
import url from 'node:url'

// GET
const getProxyAgent = () => process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined

export const checkServicesHealthController = async (req, res) => {
  const requestorId = req.session?.user?.id

  try {
    const user = getUserById(requestorId)
    if (!user) throw new Error('Vous n\'avez pas accès à cette information')

    const serviceData = await Promise.all(Object.values(allServices)
      .map(service => {
        return new Promise((resolve, _reject) => {
          const urlParsed = url.parse(service.url)
          https.get({
            ...urlParsed,
            agent: getProxyAgent(),
          }, (res) => {
            resolve({
              id: service.id,
              status: res.statusCode < 400 ? 'success' : 'error',
              message: res?.statusMessage,
              code: res?.statusCode,
            })
          })
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
