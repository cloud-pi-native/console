import { ForbiddenError } from '@/utils/errors.js'
import { getOrCreateUser } from '../queries-index.js'
import { User } from '@prisma/client'
import { servicesMonitor } from '@/plugins/services.js'
import { MonitorResults, userSchema } from '@dso-console/shared'

export const checkServicesHealth = async (requestor: User, isAdmin: boolean): Promise<MonitorResults> => {
  await userSchema.validateAsync(requestor)
  const user = await getOrCreateUser(requestor)
  if (!user) throw new ForbiddenError('Vous n\'avez pas accès à cette information')
  return servicesMonitor(isAdmin)
}
