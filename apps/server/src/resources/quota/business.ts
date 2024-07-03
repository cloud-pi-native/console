import { UnauthorizedError } from '@/utils/errors.js'
import {
  getUserById,
  getQuotas as getQuotasQuery,
  getAllQuotas,
} from '../queries-index.js'
import { UserProfile, adminGroupPath } from '@cpn-console/shared'

export const getQuotas = async (kcUser: UserProfile) => {
  const user = await getUserById(kcUser.id)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')

  const quotas = kcUser.groups?.includes(adminGroupPath)
    ? await getAllQuotas()
    : await getQuotasQuery(user.id)

  return quotas.map(({ stages, ...quota }) => {
    return {
      ...quota,
      stageIds: stages
        .map(({ id }) => id),
    }
  })
}
