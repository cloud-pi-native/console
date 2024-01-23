import { BadRequestError, ForbiddenError } from '@/utils/errors.js'
import { getOrCreateUser } from '../queries-index.js'
import { userSchema } from '@dso-console/shared'
import { type UserDetails } from '@/types/index.js'
import { services } from '@dso-console/hooks'

export const checkServicesHealth = async (requestor: UserDetails) => {
  await userSchema.validateAsync(requestor)
  const user = await getOrCreateUser(requestor)
  if (!user) throw new ForbiddenError('Vous n\'avez pas accès à cette information')

  try {
    // services.refreshStatus()
    // Object.entries(servicesInfos).forEach(([_name, infos]) => {
    //   if (infos?.monitor?.lastStatus?.cause) {
    //     console.warn(infos.monitor.lastStatus.cause)
    //   }
    // })
    return services.getStatus()
  } catch (error) {
    if (error.message.match(/^Failed to parse URL from/)) throw new BadRequestError('Url de service invalide')
    throw new Error('Echec de la récupération de l\'état des services')
  }
}
