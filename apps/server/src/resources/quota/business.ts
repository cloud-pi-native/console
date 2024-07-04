import { UnauthorizedError } from '@/utils/errors.js'
import {
  getQuotas as getQuotasQuery,
  getAllQuotas,
  getOrCreateUser,
} from '../queries-index.js'
import { UserProfile, adminGroupPath } from '@cpn-console/shared'

export const getQuotas = async (kcUser: UserProfile) => {
  const { groups: _, ...userInfo } = kcUser
  const user = await getOrCreateUser(userInfo)
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
