import { UnauthorizedError } from '@/utils/errors.js'
import {
  getUserById,
  getQuotas as getQuotasQuery,
  getAllQuotas,
} from '../queries-index.js'
import { UserProfile, adminGroupPath } from '@cpn-console/shared'

export const getQuotas = async (kcUser: UserProfile) => {
  // @ts-ignore
  const user = await getUserById(kcUser.id)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')
  if (kcUser.groups?.includes(adminGroupPath)) {
    return getAllQuotas()
  }
  return getQuotasQuery()
}
