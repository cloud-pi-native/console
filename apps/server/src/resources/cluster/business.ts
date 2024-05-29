import { UserProfile } from '@cpn-console/shared'
import { UnauthorizedError } from '@/utils/errors.js'
import {
  getUserById,
  listClustersForUser,
} from '../queries-index.js'

export const getAllUserClusters = async (kcUser: UserProfile) => {
  const user = await getUserById(kcUser.id)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')

  const clusters = await listClustersForUser(user.id)
  return clusters.map(({ stages, ...cluster }) => ({
    ...cluster,
    stageIds: stages.map(({ id }) => id) ?? [],

  }))
}
