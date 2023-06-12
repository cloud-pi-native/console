import { URL } from 'node:url'
import axios from 'axios'
import { addReqLogs } from '../utils/logger.js'
import { sendOk, sendBadRequest } from '../utils/response.js'
import { allServices } from '../utils/services.js'
import { getUserById } from '../models/queries/user-queries.js'

export const checkServicesHealthController = async (req, res) => {
  const requestorId = req.session?.user?.id

  try {
    const user = getUserById(requestorId)
    if (!user) throw new Error('Vous n\'avez pas accès à cette information')

    const serviceData = await Promise.all(Object.values(allServices)
      .map(async service => {
        const urlParsed = new URL(service.url).toString()
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
    addReqLogs({
      req,
      description: 'Etats des services récupérés avec succès',
    })
    sendOk(res, serviceData)
  } catch (error) {
    let description = 'Echec de la récupération de l\'état des services'
    if (error.message.match(/^Failed to parse URL from/)) description = 'Url de service invalide'
    addReqLogs({
      req,
      description,
      error,
    })
    sendBadRequest(res, description)
  }
}
