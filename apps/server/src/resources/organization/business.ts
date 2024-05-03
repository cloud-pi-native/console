import { getOrCreateUser, getActiveOrganizationsQuery } from '@/resources/queries-index.js'
import { UserDetails } from '@/types/index.js'
import { UnauthorizedError } from '@/utils/errors.js'
import { UserSchema } from '@cpn-console/shared'
import { validateSchema } from '@/utils/business.js'

export const getActiveOrganizations = async (requestor: UserDetails) => {
  const schemaValidation = UserSchema.safeParse(requestor)
  validateSchema(schemaValidation)
  const user = await getOrCreateUser(requestor)
  if (!user) throw new UnauthorizedError('Veuillez vous connecter')
  return getActiveOrganizationsQuery()
}
