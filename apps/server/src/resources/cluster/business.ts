import { UserProfile } from '@cpn-console/shared'
import {
  listClustersForUser,
} from '../queries-index.js'

export const getAllUserClusters = async (kcUser: UserProfile) => {
  const clusters = await listClustersForUser(kcUser.id)
  return clusters.map(({ stages, ...cluster }) => ({
    ...cluster,
    stageIds: stages.map(({ id }) => id) ?? [],
  }))
}
