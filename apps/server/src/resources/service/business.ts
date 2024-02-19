import { ForbiddenError } from '@/utils/errors.js'
import { getOrCreateUser } from '../queries-index.js'
import { UserSchema } from '@dso-console/shared'
import { type UserDetails } from '@/types/index.js'
import { services } from '@dso-console/hooks'
import { validateSchema } from '@/utils/business.js'

export const checkServicesHealth = async (requestor: Omit<UserDetails, 'groups'>) => {
  const schemaValidation = UserSchema.safeParse(requestor)
  validateSchema(schemaValidation)
  const user = await getOrCreateUser(requestor)
  if (!user) throw new ForbiddenError('Vous n\'avez pas accès à cette information')

  return services.getStatus()
}
