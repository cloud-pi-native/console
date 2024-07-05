import {
  getQuotas as getQuotasQuery,
  getAllQuotas,
} from '../queries-index.js'
import { UserProfile, adminGroupPath } from '@cpn-console/shared'

export const getQuotas = async (kcUser: UserProfile) => {
  const quotas = kcUser.groups?.includes(adminGroupPath)
    ? await getAllQuotas()
    : await getQuotasQuery(kcUser.id)

  return quotas.map(({ stages, ...quota }) => {
    return {
      ...quota,
      stageIds: stages
        .map(({ id }) => id),
    }
  })
}
