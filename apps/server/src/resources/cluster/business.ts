import { UserProfile } from '@cpn-console/shared'
import { UnauthorizedError } from '@/utils/errors.js'
import {
  getOrCreateUser,
  listClustersForUser,
} from '../queries-index.js'

export const getAllUserClusters = async (kcUser: UserProfile) => {
  const { groups: _, ...userInfo } = kcUser
  const user = await getOrCreateUser(userInfo)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')

  const clusters = await listClustersForUser(user.id)
  return clusters.map(({ stages, ...cluster }) => ({
    ...cluster,
    stageIds: stages.map(({ id }) => id) ?? [],

  }))
}
