import { BadRequestError, ForbiddenError } from '@/utils/errors.js'
import { getOrCreateUser } from '../queries-index.js'
import { User } from '@prisma/client'
import axios, { AxiosResponse } from 'axios'
import { type ServiceInfos, servicesInfos } from '@/plugins/services.js'
import { userSchema } from '@dso-console/shared'

export const checkServicesHealth = async (requestor: User) => {
  await userSchema.validateAsync(requestor)
  const user = await getOrCreateUser(requestor)
  if (!user) throw new ForbiddenError('Vous n\'avez pas accès à cette information')

  try {
    return await Promise.all(Object.values(servicesInfos)
      // @ts-ignore
      .filter(({ monitorUrl }) => monitorUrl)
      .map(async (service: ServiceInfos) => {
        if (!service.monitorUrl) return
        const urlParsed = new URL(service.monitorUrl).toString()
        let res: AxiosResponse<any>
        try {
          res = await axios.get(urlParsed, { validateStatus: () => true })
          return {
            name: service.title,
            status: res.status < 400 ? 'success' : 'error',
            message: `${res?.statusText}`,
            code: res?.status,
          }
        } catch (error) {
          return {
            name: service.title,
            status: res?.status < 400 ? 'success' : 'error',
            message: `Erreur : ${error.message}`,
            code: res?.status,
          }
        }
      }),
    )
  } catch (error) {
    if (error.message.match(/^Failed to parse URL from/)) throw new BadRequestError('Url de service invalide')
    throw new Error('Echec de la récupération de l\'état des services')
  }
}
