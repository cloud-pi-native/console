import { getOrCreateUser, getActiveOrganizationsQuery } from '@/resources/queries-index.js'
import { UserDetails } from '@/types/index.js'
import { NotFoundError, UnauthorizedError } from '@/utils/errors.js'
import { UserSchema } from '@cpn-console/shared'
import { validateSchema } from '@/utils/business.js'

export const getActiveOrganizations = async (requestor: UserDetails) => {
  const schemaValidation = UserSchema.safeParse(requestor)
  validateSchema(schemaValidation)
  const user = await getOrCreateUser(requestor)
  if (!user) throw new UnauthorizedError('Veuillez vous connecter')
  const organizations = await getActiveOrganizationsQuery()
  if (!organizations) throw new NotFoundError('Aucune organisation active trouvée')
  return organizations
}
