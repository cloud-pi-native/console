import { getOrCreateUser, getActiveOrganizationsQuery, getOrganizationById } from '@/resources/queries-index.js'
import { UserDetails } from '@/types/index.js'
import { NotFoundError, UnauthorizedError } from '@/utils/errors.js'
import { userSchema } from '@dso-console/shared'

// TODO 539 : à supprimer ? n'est pas utilisé
export const getOrganizationInfos = async (organizationId: string) => {
  const organization = await getOrganizationById(organizationId)
  if (!organization) throw new NotFoundError('Organization introuvable', undefined)
  return organization
}

export const getActiveOrganizations = async (requestor: UserDetails) => {
  await userSchema.validateAsync(requestor)
  const user = await getOrCreateUser(requestor)
  if (!user) throw new UnauthorizedError('Veuillez vous connecter')
  const organizations = await getActiveOrganizationsQuery()
  if (!organizations) throw new NotFoundError('Aucune organisation active trouvée')
  return organizations
}
