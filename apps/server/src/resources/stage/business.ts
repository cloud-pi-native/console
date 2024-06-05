import type { Cluster, QuotaStage, Stage, User } from '@prisma/client'
import { UnauthorizedError } from '@/utils/errors.js'
import {
  getUserById,
  getStages as getStagesQuery,
  linkClusterToStages as linkClusterToStagesQuery,
  getAllStageIds,
} from '../queries-index.js'

type bindStageAndClusterIdsParam = Stage & {
  quotaStage: QuotaStage[]
  clusters: { id: Cluster['id'] }[]
}

export const bindStageAndClusterIds = ({ clusters, ...stage }: bindStageAndClusterIdsParam) => ({
  ...stage,
  clusterIds: clusters.map(({ id }) => id),
})

export const getStages = async (userId: User['id']) => {
  const user = await getUserById(userId)
  if (!user) throw new UnauthorizedError('Vous n\'êtes pas connecté')
  const stages = await getStagesQuery()
  return stages.map(stage => bindStageAndClusterIds(stage))
}

export const linkClusterToStages = async (clusterId: Cluster['id'], stageIds: Stage['id'][], linkToAll: boolean = false) => {
  if (linkToAll === true) {
    stageIds = await getAllStageIds()
  }
  await linkClusterToStagesQuery(clusterId, stageIds)
}
