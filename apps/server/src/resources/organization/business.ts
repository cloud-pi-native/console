import { getOrganizationById } from '@/resources/queries-index.js'
import { NotFoundError } from '@/utils/errors.js'

export const getOrganizationInfos = async (organizationId: string) => {
  const organization = await getOrganizationById(organizationId)
  if (!organization) throw new NotFoundError('Organization introuvable')
  return organization
}
