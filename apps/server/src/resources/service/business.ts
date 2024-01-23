import { ForbiddenError } from '@/utils/errors.js'
import { getOrCreateUser } from '../queries-index.js'
import { userSchema } from '@dso-console/shared'
import { type UserDetails } from '@/types/index.js'
import { services } from '@dso-console/hooks'

export const checkServicesHealth = async (requestor: UserDetails) => {
  await userSchema.validateAsync(requestor)
  const user = await getOrCreateUser(requestor)
  if (!user) throw new ForbiddenError('Vous n\'avez pas accès à cette information')

  return services.getStatus()
}
