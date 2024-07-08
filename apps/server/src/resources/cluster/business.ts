import { UserProfile, adminGroupPath } from '@cpn-console/shared'
import {
  listClustersForUser,
} from '../queries-index.js'

export const getAllUserClusters = async (kcUser: UserProfile) => {
  const isAdmin = kcUser.groups?.includes(adminGroupPath)
  const clusters = await listClustersForUser(isAdmin, kcUser.id)
  return clusters.map(({ stages, ...cluster }) => ({
    ...cluster,
    stageIds: stages.map(({ id }) => id) ?? [],
  }))
}
