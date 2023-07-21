import { getOrCreateUser, getActiveOrganizationsQuery, getOrganizationById } from '@/resources/queries-index.js'
import { NotFoundError, UnauthorizedError } from '@/utils/errors.js'
import { UserDto } from '../user/business.js'

// TODO 539 : à supprimer ? n'est pas utilisé
export const getOrganizationInfos = async (organizationId: string) => {
  const organization = await getOrganizationById(organizationId)
  if (!organization) throw new NotFoundError('Organization introuvable', undefined)
  return organization
}

export const getActiveOrganizations = async (requestor: UserDto) => {
  const user = await getOrCreateUser(requestor)
  if (!user) throw new UnauthorizedError('Veuillez vous connecter')
  const organizations = await getActiveOrganizationsQuery()
  if (!organizations) throw new NotFoundError('Aucune organisation active trouvée')
  return organizations
}
